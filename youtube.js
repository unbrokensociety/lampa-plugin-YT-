// Скрипт проверки CSS-баланса в плагине
var fs = require('fs');
var code = fs.readFileSync('youtube-player-style.js', 'utf8');

// Находим все CSS-строки (между кавычками в массиве styles)
var cssStrings = [];
var re = /'([^']*)'/g;
var startIdx = code.indexOf("var styles = [");
var endIdx = code.indexOf("].join('\\n')");
var block = code.substring(startIdx, endIdx);

var match;
while ((match = re.exec(block)) !== null) {
    cssStrings.push(match[1]);
}

var css = cssStrings.join('\n');

var openBraces = (css.match(/\{/g) || []).length;
var closeBraces = (css.match(/\}/g) || []).length;
var importantCount = (css.match(/!important/g) || []).length;
var mediaCount = (css.match(/@media/g) || []).length;
var keyframesCount = (css.match(/@keyframes/g) || []).length;

console.log('=== CSS VALIDATION ===');
console.log('Total CSS lines:', cssStrings.length);
console.log('Open braces {:', openBraces);
console.log('Close braces }:', closeBraces);
console.log('Balanced:', openBraces === closeBraces ? 'YES' : 'NO');
console.log('!important count:', importantCount);
console.log('@media blocks:', mediaCount);
console.log('@keyframes blocks:', keyframesCount);

if (openBraces !== closeBraces) {
    console.log('\nERROR: Unbalanced braces!');
    // Find which lines are problematic
    var depth = 0;
    cssStrings.forEach(function(line, i) {
        var o = (line.match(/\{/g) || []).length;
        var c = (line.match(/\}/g) || []).length;
        depth += o - c;
        if (depth < 0) {
            console.log('  Line ' + i + ' goes negative: "' + line.trim() + '"');
        }
    });
} else {
    console.log('\nSTATUS: CSS IS VALID');
}
