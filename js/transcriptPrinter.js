let getRawTranscript = function()
{
    let arr = [];
    let elms = $(".cielo24-vwrap-sentence");
    for (let i = 0; i < elms.length; i++) {
        if (elms[i].innerText) {
            arr.push(elms[i].innerText);
        }
    }
    return arr.join(" ");
}

function getFileName(extension)
{
    let title = document.getElementsByClassName("comp titleLabel pull-left")[0].innerText;
    let titleNum = title.split(" ")[0];
    let titleLabel = title.substring(titleNum.length, title.length).replace("-", "").replace(/\s+/g, '').replace(",","");
    return `${titleNum}_mgt6051_${titleLabel}.${extension}`;
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

let getTimeAccountedText = async function(timeGrouping_sec, outputLength_sec, onGetText, onGetTranscript)
{
    console.log("getting script...")
    let getScript = function (url) {
        return new Promise(function(resolve, reject) {
            $.getScript(url).done(function (script) {
                resolve(script);
            });
        });
    };
    let momentUrl = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js";
    await getScript(momentUrl);
    console.log("got script...")
    let DILATION_FACTOR = outputLength_sec / document.getElementsByClassName("persistentNativePlayer nativeEmbedPlayerPid")[0].duration;

    let refObj = {};
    refObj.arr = [];
    refObj.lastPrintedMoment = moment("01/01/2000 00:00:00");
    refObj.timeGrouping_sec = timeGrouping_sec;
    let elms = $(".cielo24-vwrap-sentence");
    for (let i = 0; i < elms.length; i++) {
        elms[i].id = `transcript-id-${i}`;
    }
    for (let i = 0; i < elms.length; i++) {
        refObj.sentenceWrapperId = elms[i].id;
        refObj.text = elms[i].innerText;
        refObj.textTime = getTextTimeObj(refObj.text);
        refObj.textTime.start_ms = $(elms[i]).data('start-time') * DILATION_FACTOR;
        refObj.textTime.end_ms = $(elms[i]).data('end-time') * DILATION_FACTOR;
        refObj.textTime.timeDiff_ms = $(elms[i]).data('end-time') - $(elms[i]).data('start-time');
        refObj.textTime.startTimeStamp = moment('01/01/2000 00:00:00').add(refObj.textTime.start_ms, 'ms');
        refObj.textTime.endTimeStamp = moment('01/01/2000 00:00:00').add(refObj.textTime.end_ms, 'ms');
        await onGetText(refObj);
    }

    onGetTranscript(refObj.arr);
}

let makePdf = function (textToPrint) {
    let jsPDFUrl = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.2/jspdf.min.js";
    $.getScript(jsPDFUrl, function (data) {
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
        doc.save(getFileName("pdf"));
    });
}

function makeSubtitles(subtitleTextArray)
{
    let file = new Blob(subtitleTextArray,{ type: "text/plain;charset=utf-8" });
    const a = document.createElement('a');
    a.href= URL.createObjectURL(file);

    a.download = getFileName("srt");
    a.click();
    URL.revokeObjectURL(a.href);
}

async function onGetText_Transcript(refObj)
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
let lastTime = 0;
async function onGetText_Subtitles(refObj)
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

    function getWordElement(sentenceWrapperId, wordIndex)
    {
        let children = $(document.getElementById(sentenceWrapperId)).context.children;
        let newArray = [];
        //exclude the timestamp (first element)
        //exclude punctuation
        for (let i =1; i<children.length; i++)
        {
            let trimmed = children[i].innerText.trimEnd();
            if(trimmed === "," || trimmed === ";" || trimmed === ".")
            {
                continue;
            }
            newArray.push(children[i]);
        }
        return newArray[wordIndex];
    }

    async function getEndMoment(sentenceWrapperId, wordIndex, startMoment, fallbackAddend_ms)
    {
        let wordElm = getWordElement(sentenceWrapperId, wordIndex);
        wordElm.click();
        await sleep(10);
        let currentTime = document.getElementsByClassName("persistentNativePlayer nativeEmbedPlayerPid")[0].currentTime;
        if(currentTime === lastTime)
        {
            return moment(startMoment).add(fallbackAddend_ms, 'ms');
        }
        lastTime = currentTime;
        return moment("01/01/2000 00:00:00").add(currentTime, 's');
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function getCycleTextTime(wordsArray, refObj, cycleData)
    {
        let firstWordIndex = cycleData.previousWordIndex > 0 ? cycleData.previousWordIndex + 1 : 0;
        let finalCharacterIndex = getFinalCharacterIndex(refObj.textTime.text, cycleData);
        let finalWordIndex = getFinalWordIndex(refObj.textTime.text, finalCharacterIndex);
        let subWordArray = wordsArray.slice(firstWordIndex, finalWordIndex + 1);
        let endMoment = await getEndMoment(refObj.sentenceWrapperId, finalWordIndex, refObj.textTime.startTimeStamp, cycleData.cycleTime_sec * 1000);

        let isLast = finalWordIndex >= wordsArray.length - 1
        let isEndMomentLater = endMoment.diff(refObj.textTime.endTimeStamp, 'ms') < 0;
        if(isLast || isEndMomentLater)
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
        let iterTextTime = await getCycleTextTime(wordsArray, refObj, cycleData);
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

getTimeAccountedText(30, 1, onGetText_Transcript, (transArray)=>{
    if(transArray)
    {
        makePdf(transArray.join(" "));
    }
});

getTimeAccountedText(6.0, 100 * 60 + 30, onGetText_Subtitles, (transArray)=>{
    if(transArray)
    {
        makeSubtitles(transArray);
    }
});

//todo: provide opt to remove timestamps
//todo: print to .pdf file