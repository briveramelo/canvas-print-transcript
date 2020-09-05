let getTranscript = function()
{
    let arr = [];
    let elms = $(".cielo24-vwrap-sentence");
    for (let i = 0; i < elms.length; i++) {
        if (elms[i].innerText !== null) {
            arr.push(elms[i].innerText);
        }
    }
    return arr.join("");
}

let jsPDFUrl = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.2/jspdf.min.js";
let makePdf = function (textToPrint) {
    $.getScript(jsPDFUrl, function (data) {
        let doc = new jsPDF();
        doc.setFontSize(12);
        doc.setTextColor(0,0,0);
        let defaultTextPos = {x: 15, y: 10};
        let textPos = {x: defaultTextPos.x, y: defaultTextPos.y};

        let applyNewLine = function (height, lineCount, textPos) {
            lineCount = lineCount || 1;
            for (let i = 0; i < lineCount; i++) {
                textPos.y += height;
            }
        };
        let writeLine = function (doc, line, lineHeight, textPos) {
            doc.text(textPos.x, textPos.y, line);
            applyNewLine(lineHeight, textPos);
        };
        let writeLines = function (doc, text, lineHeight, lineWidth, textPos) {
            let lines = doc.splitTextToSize(text, lineWidth);
            console.log(text);
            console.log(lines);
            for (let i = 0; i < lines.length; i++) {
                // if (textPos.y > doc.internal.pageSize.height - lineHeight) {
                //     resetTextPos(textPos);
                //     doc.addPage();
                // }
                writeLine(doc, lines[i], lineHeight, textPos);
            }
        };
        let resetTextPos = function (textPos) {
            textPos.x = defaultTextPos.x;
            textPos.y = defaultTextPos.y;
        }
        // writeLines(doc, textToPrint, 12, 167, textPos);
        let lines = doc.splitTextToSize(textToPrint, 167);
        doc.text(15, 10, lines);
        doc.save(`MGT6051_LectureVideoTranscript.pdf`);
    });
}
makePdf(getTranscript());
//todo: provide opt to remove timestamps
//todo: print to .pdf file