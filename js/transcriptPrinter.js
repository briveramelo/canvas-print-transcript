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

function getFileName()
{
    let title = document.getElementsByClassName("comp titleLabel pull-left")[0].innerText;
    let titleNum = title.split(" ")[0];
    let titleLabel = title.substring(titleNum.length, title.length).replace("-", "").replace(/\s+/g, '').replace(",","");
    return `${titleNum}_mgt6051_${titleLabel}.pdf`;
}

let getTimeAccountedTranscript = function(timeGrouping_sec, onGetTranscript)
{
    let momentUrl = "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js";
    $.getScript(momentUrl, function (data) {

        let getTextTimeObj = function(text)
        {
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

        let arr = [];
        let elms = $(".cielo24-vwrap-sentence");
        let lastPrintedMoment = moment("01/01/2000 00:00:00");
        for (let i = 0; i < elms.length; i++) {
            let text = elms[i].innerText;
            if (text) {
                let textTime = getTextTimeObj(text);
                if(textTime)
                {
                    if(textTime.timeStamp.diff(lastPrintedMoment, 'seconds') < timeGrouping_sec)
                    {
                        arr.push(textTime.text);
                        continue;
                    }
                    lastPrintedMoment = textTime.timeStamp;
                }
                arr.push(`\n${text}`);
            }
        }

        onGetTranscript(arr.join(" "))
    });
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
        doc.save(getFileName());
    });
}

// let trans = getRawTranscript();
// if(trans)
// {
//     makePdf(trans);
// }

getTimeAccountedTranscript(30, (trans)=>{
    if(trans)
    {
        makePdf(trans);
    }
});

//todo: provide opt to remove timestamps
//todo: print to .pdf file