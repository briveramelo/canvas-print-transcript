# Canvas Transcript Printer

## Steps
1. Open the canvas page with the desired videos*
*The videos must include the UI elements beneath the video that display the transcript, as this is the content that will be pulled
2. Right click the video element and select "Inspect"
3. Select the "Console" tab
4. Copy and paste the javascript code within this repository located at https://github.com/briveramelo/canvas-print-transcript/blob/master/js/transcriptPrinter.js into the console
5. Scroll to the bottom of the code and choose your settings*
eg: Set `var classname = "yourDesiredClassName"`
*If you are not downloading the videos and do not care about the subtitles, set `var isDownloadSubtitles = false`
*You can also ignore the videoDurations variable
6. Press enter
END

Each transcript should sequentially download to your computer. If you find that there are repeat contents in sequential PDFS, try increasing the value for `loadingDelay_ms` to something higher from 5000 to 7000 or more as needed
