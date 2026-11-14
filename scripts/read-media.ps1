$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
    $propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
    function Await-Operation($operation, $resultType) {
        $method = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
            $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and
            $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
        } | Select-Object -First 1
        $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
        if (-not $task.Wait(4000)) { throw 'Media request timed out' }
        return $task.Result
    }
    $manager = Await-Operation ($managerType::RequestAsync()) $managerType
    $current = $manager.GetCurrentSession()
    $sessions = @($manager.GetSessions())
    # Prefer a playing session; Windows' current session can be paused.
    $playing = @($sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing' })
    if ($playing.Count -gt 0 -and ($null -eq $current -or $current.GetPlaybackInfo().PlaybackStatus.ToString() -ne 'Playing')) {
        $current = $playing[0]
    }
    if ($null -eq $current) {
        @{ status = 'idle' } | ConvertTo-Json -Compress
        exit 0
    }
    $properties = Await-Operation ($current.TryGetMediaPropertiesAsync()) $propertiesType
    $timeline = $current.GetTimelineProperties()
    $duration = [Math]::Max(0, ($timeline.EndTime - $timeline.StartTime).TotalSeconds)
    $position = [Math]::Max(0, ($timeline.Position - $timeline.StartTime).TotalSeconds)
    $artwork = ''
    if ($null -ne $properties.Thumbnail) {
        try {
            $streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime]
            $stream = Await-Operation ($properties.Thumbnail.OpenReadAsync()) $streamType
            if ($stream.Size -gt 0 -and $stream.Size -le 1000000 -and $stream.ContentType -in @('image/jpeg','image/png')) {
                $reader = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
                try {
                    $null = Await-Operation ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
                    $bytes = New-Object byte[] ([int]$stream.Size)
                    $reader.ReadBytes($bytes)
                    $artwork = 'data:' + $stream.ContentType + ';base64,' + [Convert]::ToBase64String($bytes)
                } finally { $reader.Dispose() }
            }
            $stream.Dispose()
        } catch { $artwork = '' }
    }
    @{
        status = 'available'
        source = $current.SourceAppUserModelId
        title = $properties.Title
        artist = $properties.Artist
        album = $properties.AlbumTitle
        artwork = $artwork
        duration = $duration
        position = $position
        playback = $current.GetPlaybackInfo().PlaybackStatus.ToString()
    } | ConvertTo-Json -Compress
} catch {
    # Do not expose process paths, diagnostics, or private metadata in error text.
    @{ status = 'unavailable' } | ConvertTo-Json -Compress
    exit 1
}
