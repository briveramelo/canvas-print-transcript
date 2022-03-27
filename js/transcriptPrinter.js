let getScript = function (url) {
    return new Promise(function(resolve, reject) {
        $.getScript(url).done(function (script) {
            resolve(script);
        });
    });
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getFileName(className, extension)
{
    let title = document.getElementsByClassName("comp titleLabel pull-left")[0].innerText;
    let titleNum = title.split(" ")[0];
    let titleLabel = title.substring(titleNum.length, title.length).replace("-", "").replace(/\s+/g, '').replace(",","");
    return `${titleNum}_${className}_${titleLabel}.${extension}`;
}

let getTextTimeObj = function(text)
{
    if(text == null)
    {
        return null;
    }

    let timePattern = /^([0-9]{2}:[0-9]{2}:[0-9]{2})[\n]*(.*)$/g;
    let matches = text.matchAll(timePattern);
    let captures = matches.next().value;

    if(captures && captures.length > 2)
    {
        return {
            timeStamp:moment(`01/01/2000 ${captures[1]}`),
            text:captures[2],
        }
    }
    return null;
}

function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function hasKeys(obj, expectedKeysArray) {
    if (!Array.isArray(expectedKeysArray))
    {
        return false;
    }

    let keys = Object.keys(obj);
    for(let i = 0; i < keys.length; i++)
    {
        if(!obj.hasOwnProperty(keys[i]))
        {
            return false;
        }
    }
    return true;
}
function durationToSec(duration)
{
    if(!hasKeys(duration, ['h','m','s']))
    {
        console.error('duration object must have h,m,s keys generated from the printFileDurations.sh script');
        return null;
    }
    return duration.s + duration.m * 60 + duration.h * 60 * 60;
}

let getTextArray = async function(timeGrouping_sec, videoDuration, onGetTextLine)
{
    if(!isMomentLoaded)
    {
        let momentUrl = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js";
        await getScript(momentUrl);
        isMomentLoaded = true;
    }

    let videoDuration_sec = Number.isNaN(videoDuration.s) ? 1 : durationToSec(videoDuration);
    onGetTextLine = isFunction(onGetTextLine) ? onGetTextLine : videoDuration; //redefine input variables as an ugly alternate to function overloads

    let DILATION_FACTOR = videoDuration_sec / document.getElementsByClassName("persistentNativePlayer nativeEmbedPlayerPid")[0].duration;

    let refObj = {};
    refObj.arr = [];
    refObj.lastPrintedMoment = moment("01/01/2000 00:00:00");
    refObj.timeGrouping_sec = timeGrouping_sec;
    let elms = $(".cielo24-vwrap-sentence");
    for (let i = 0; i < elms.length; i++) {
        refObj.text = elms[i].innerText;
        refObj.textTime = getTextTimeObj(refObj.text);
        refObj.textTime.start_ms = $(elms[i]).data('start-time') * DILATION_FACTOR;
        refObj.textTime.end_ms = $(elms[i]).data('end-time') * DILATION_FACTOR;
        refObj.textTime.timeDiff_ms = $(elms[i]).data('end-time') - $(elms[i]).data('start-time');
        refObj.textTime.startTimeStamp = moment('01/01/2000 00:00:00').add(refObj.textTime.start_ms, 'ms');
        refObj.textTime.endTimeStamp = moment('01/01/2000 00:00:00').add(refObj.textTime.end_ms, 'ms');
        onGetTextLine(refObj);
    }

    return refObj.arr;
}

let makePdf = async function (fileName, textToPrint) {
    if(!isJsPdfLoaded)
    {
        let jsPDFUrl = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.2/jspdf.min.js";
        await getScript(jsPDFUrl);
        isJsPdfLoaded = true;
    }

    let doc = new jsPDF();
    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    let defaultTextPos = {x: 18, y: 18};
    let textPos = {x: defaultTextPos.x, y: defaultTextPos.y};

    let applyNewLine = function (height, lineCount, textPos) {
        lineCount = lineCount || 1;
        for (let i = 0; i < lineCount; i++) {
            textPos.y += height;
        }
    };
    let writeLine = function (doc, line, lineHeight, textPos) {
        doc.text(textPos.x, textPos.y, line);
        applyNewLine(lineHeight, 1, textPos);
    };
    let writeLines = function (doc, text, lineHeight, lineWidth, textPos) {
        let lines = doc.splitTextToSize(text, lineWidth);
        for (let i = 0; i < lines.length; i++) {
            if (textPos.y > doc.internal.pageSize.height - lineHeight * 2) {
                resetTextPos(textPos);
                doc.addPage();
            }
            writeLine(doc, lines[i], lineHeight, textPos);
        }
    };
    let resetTextPos = function (textPos) {
        textPos.x = defaultTextPos.x;
        textPos.y = defaultTextPos.y;
    }
    writeLines(doc, textToPrint, 6, 175, textPos);
    doc.save(fileName);
}

function makeSubtitles(fileName, subtitleTextArray)
{
    let file = new Blob(subtitleTextArray,{ type: "text/plain;charset=utf-8" });
    const a = document.createElement('a');
    a.href= URL.createObjectURL(file);

    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function onGetTextLine_Pdf(refObj)
{
    if (!refObj.text) {
        return;
    }

    if(refObj.textTime)
    {
        if(refObj.textTime.timeStamp.diff(refObj.lastPrintedMoment, 'seconds') <= refObj.timeGrouping_sec)
        {
            refObj.arr.push(refObj.textTime.text);
            return;
        }
        refObj.lastPrintedMoment = refObj.textTime.timeStamp;
    }
    refObj.arr.push(`\n${refObj.text}`);
}

function onGetTextLine_Subtitles(refObj)
{
    if (!refObj.text) {
        return;
    }

    function getFinalCharacterIndex(text, cycleData)
    {
        let numCharactersPerCycle = Math.ceil(text.length / cycleData.numCycles);
        let finalCharacterIndex = cycleData.previousCharacterIndex + numCharactersPerCycle;
        while(true) {
            if(finalCharacterIndex >= text.length)
            {
                finalCharacterIndex = text.length - 1;
                break;
            }

            if(text[finalCharacterIndex] === " ")
            {
                finalCharacterIndex--;
                break;
            }

            finalCharacterIndex++;
        }
        return finalCharacterIndex;
    }

    function getFinalWordIndex(text, finalCharacterIndex)
    {
        let wordsArray = text.split(" ");
        let wordsLengthArray = [];
        for (let i = 0; i < wordsArray.length; i++)
        {
            let previousLength = i - 1 < 0 ? 0 : wordsLengthArray[i - 1];
            let currentLength = wordsArray[i].length + previousLength;
            currentLength += i === wordsArray.length - 1 ? 0 : 1; //must re-add the " " space character for all non-terminal words
            wordsLengthArray.push(currentLength);
            if(finalCharacterIndex <= wordsLengthArray[i])
            {
                return i;
            }
        }
        return wordsLengthArray.length - 1;
    }

    function getCycleTextTime(wordsArray, refObj, cycleData)
    {
        let firstWordIndex = cycleData.previousWordIndex > 0 ? cycleData.previousWordIndex + 1 : 0;
        let finalCharacterIndex = getFinalCharacterIndex(refObj.textTime.text, cycleData);
        let finalWordIndex = getFinalWordIndex(refObj.textTime.text, finalCharacterIndex);
        let subWordArray = wordsArray.slice(firstWordIndex, finalWordIndex + 1);
        let endMoment = moment(refObj.lastPrintedMoment).add(cycleData.cycleTime_sec, 'seconds');
        let isLast = finalWordIndex >= wordsArray.length - 1
        if(isLast)
        {
            endMoment = refObj.textTime.endTimeStamp;
        }

        cycleData.previousWordIndex = finalWordIndex;
        cycleData.previousCharacterIndex = finalCharacterIndex;
        return {
            timeStamp: endMoment,
            text: subWordArray.join(" "),
            isLast: isLast
        };
    }

    let timeDiff_sec = refObj.textTime.timeDiff_ms / 1000;
    let wordsArray = refObj.textTime.text.split(" ");
    let numCycles = Math.ceil(timeDiff_sec / refObj.timeGrouping_sec);
    let cycleTime_sec = timeDiff_sec / numCycles;
    if(numCycles < 1) numCycles = 1;
    let cycleData = {
        cycleTime_sec: cycleTime_sec,
        numCycles: numCycles,
        previousWordIndex: 0,
        previousCharacterIndex: 0,
    };

    for (let i = 0; i < cycleData.numCycles; i++)
    {
        let iterTextTime = getCycleTextTime(wordsArray, refObj, cycleData);
        let numLinesPerSubtitle = 4;
        let currentSubtitleIndex = Math.floor(refObj.arr.length / numLinesPerSubtitle);
        let startTime = i === 0 ? refObj.textTime.startTimeStamp : refObj.lastPrintedMoment;
        let endTime = iterTextTime.timeStamp;

        refObj.arr.push(`${currentSubtitleIndex}`);
        refObj.arr.push(`\n${startTime.format('HH:mm:ss,SSS')} --> ${endTime.format('HH:mm:ss,SSS')}`);
        refObj.arr.push(`\n${iterTextTime.text}`);
        refObj.arr.push(`\n\n`);
        refObj.lastPrintedMoment = endTime;
        if(iterTextTime.isLast)
        {
            break;
        }
    }
}
let getPdf = async function(fileName)
{
    let transcriptArray = await getTextArray(30, onGetTextLine_Pdf);
    await makePdf(fileName, transcriptArray.join(" "));
}

let getSubtitles = async function(fileName, videoDuration)
{
    let subtitleArray = await getTextArray(6.0, videoDuration, onGetTextLine_Subtitles);
    makeSubtitles(fileName, subtitleArray);
}

async function tryLoadNextVideoRecursive()
{
    if(!isDownloadPdf && !isDownloadSubtitles)
    {
        console.error("must set to download pdf or transcript. nothing will occur with both set to false");
        return;
    }

    if(isDownloadSubtitles && videoDurations.length !== videoLinks.length)
    {
        console.error("videoDurations and videoLinks must be the same length");
        console.error(`${videoDurations.length}!=${videoLinks.length}`);
        return;
    }

    videoIndex++;
    if(videoIndex >= videoLinks.length)
    {
        console.log('final transcript loaded');
        return;
    }

    //call this to clear the current history of url queries to start fresh for the next download
    performance.clearResourceTimings();
    videoLinks[videoIndex].click();
    await sleep(loadingDelay_ms);
    let actions = [];
    if(isDownloadPdf)
    {
        actions.push(getPdf(getFileName(className, "pdf")));
    }
    if(isDownloadSubtitles)
    {
        actions.push(getSubtitles(getFileName(className, "srt"), videoDurations[videoIndex]));
    }
    if(actions.length > 0)
    {
        await Promise.all(actions);
        console.log(`Transcript loaded: ${videoIndex + 1}/${videoLinks.length} complete.`);
    }
    tryLoadNextVideoRecursive();
}

function loadPlaylistTranscripts()
{
    videoLinks = $('.chapterBox.mediaBox');
    if(videoLinks.length == 0)
    {
        videoLinks = $('.btn.comp.playPauseBtn.display-high.icon-play');
    }
    tryLoadNextVideoRecursive();
}

function loadCurrentTranscript()
{
    videoLinks = $('.chapterBox.mediaBox.active');
    if(videoLinks.length == 0)
    {
        videoLinks = $('.btn.comp.playPauseBtn.display-high.icon-play');
    }
    tryLoadNextVideoRecursive();
}

//globals
var videoLinks = [];
var videoIndex = -1;
var isMomentLoaded = false;
var isJsPdfLoaded = false;


//options
var className = "ois6040";
var loadingDelay_ms = 5000;
var videoDurations = [ //video durations are only used for the .srt file transcript to adjust for duration differences between downloaded video length and original canvas video length
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},
    {h:555,m:555,s:555},//10
];
var isDownloadPdf = true;
var isDownloadSubtitles = true;

loadPlaylistTranscripts();
// loadCurrentTranscript();

// notes for non-standard video html element:
// CC closed captions appear in an html element with a class called '.captionContainer'
// Opt+Cmd+F with this class returns a file from cdnisec.kaltura called 'load.php', though it appears to be js
// when putting a breakpoint in a function called 'addCaption'
// the variable 'source.captions' is an array holding all text and timestamps of appearance
// the text includes html elements like '<br>'
// ultimately triggered from a native callback called 'loadEmbeddedCaptions'
/*function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
let playlistUrl = performance.getEntriesByType("resource").filter(item=>item.name.includes("index.m3u8?Policy")).map(item=>item.name).filter(onlyUnique)[0];
 */