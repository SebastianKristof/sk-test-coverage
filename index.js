
/*
* tool to extract should statements from all files
*/

const readline = require('readline');
const fs = require('fs');
const glob = require("glob");
const argv = require('yargs')
    .usage('Usage: $0 --dir [starting directory] --out [output file prefix]')
    //.demandOption(['dir','out'])
    .default ('dir', '~/GitHub/sense-client/web/assets/hldm/')
    .default ('out', 'tests_')
    .argv;

//argv.dir = ".";
//argv.out = "test9.csv";
console.log(argv.dir);
console.log(argv.out);
const workingDir = argv.dir;
const outFileTests = argv.out + 'tests.csv';
const outFileStats = argv.out + 'stats.csv';

//improve: if file exists, ask to overwite; for now, just overwrite
fs.writeFile(outFileTests, 'Path,File_Name,Test_Type,Test_Number_In_File,Line_Number,Implemented_Status,Should,Describe\n', function (err) {
    if (err) {
        return console.log("Error writing file: " + err);
    }
});
fs.writeFile(outFileStats, 'Path,File_Name,Implemented,Necessary,Percentage\n', function (err) {
    if (err) {
        return console.log("Error writing file: " + err);
    }
});    

glob(`${workingDir}/**/*spec.js`, {"ignore":[`${workingDir}/**/node_modules/**`]}, function (er, fileNames) {
    
    fileNames.forEach(function(fileName) {
        const rl = readline.createInterface({
            input: fs.createReadStream(fileName)
        });

        //separate into path and filename
        var fileNameRelativePath = fileName.replace(workingDir,'./');
        var fileNamesArray = fileNameRelativePath.split('/');
        var fileNameOnly = fileNamesArray.pop();
        var pathWithinDir = fileNamesArray.join('/');
    
        //determie test type
        var testType = 'Unknown';
        if (fileName.match('comp.spec.js')) {
            testType = 'Component test';
        } else {
            testType = 'Unit test';
        }
    
        extractTests(rl, fileName, testType, pathWithinDir, fileNameOnly, function (testsInFile){
            //console.log(`${testsInFile.itCount} its and ${testsInFile.ntCount} nts in file ${fileName}`);
            
            //put some counters in here so we get counts of 100%, <100%, and not ready
            var percentImplemented = (testsInFile.ntCount >= testsInFile.itCount) ? testsInFile.itCount/testsInFile.ntCount*100 : 'nt not ready';
            fs.appendFile(outFileStats, `${pathWithinDir},${fileNameOnly},${testsInFile.itCount},${testsInFile.ntCount},${percentImplemented}\n`, function (err) {
                if (err) {
                    return console.log("Error appending file: " + err);
                }
            });
        });
    });
    console.log(`Glob processed ${fileNames.length} files`);
}).on('end', () => {
    console.log(`Glob finished`);
});

const extractTests = (rl, fileName, testType, pathWithinDir, fileNameOnly, callback) => {
    var lineNumber = 0;
    var itCounter = 0;
    var ntCounter = 0;
    var describeStatement = 'Unknown';
    var itStatement = 'Unknown';
    var ntStatement = 'Unknown';
    var quoteUsed = '';
    
    rl.on('line', (line) => {
        lineNumber++;
        if (line.trim().startsWith("describe(")) {
            try {
                quoteUsed = line.trim().match(/\"|\'/g)[0];
                describeStatement = line.split(quoteUsed)[1];
            } catch (e) {
                console.log(`Error in file: ${fileName}, line # ${lineNumber}`);
                describeStatement = '### Error parsing the describe statement ###';
            }
            describeStatement = describeStatement.replace(',','');
        }
        if (line.trim().startsWith("it(")) {
            itCounter++;
            try {
                quoteUsed = line.trim().match(/\"|\'/g)[0];
                itStatement = line.split(quoteUsed)[1];
            } catch (e) {
                console.log(`Error in file: ${fileName}, line # ${lineNumber}`);
                itStatement = '### Error parsing the it statement ###';
            }
            itStatement = itStatement.replace(',','');
            fs.appendFile(outFileTests, `${pathWithinDir},${fileNameOnly},${testType},${itCounter},${lineNumber},Implemented,${itStatement},${describeStatement}\n`, function (err) {
                if (err) {
                    return console.log("Error appending file: " + err);
                }
            });
        }
        if (line.trim().startsWith("nt(")) {
            ntCounter++;
            try {
                quoteUsed = line.trim().match(/\"|\'/g)[0];
                ntStatement = line.split(quoteUsed)[1];
            } catch (e) {
                console.log(`Error in file: ${fileName}, line # ${lineNumber}`);
                ntStatement = '### Error parsing the nt statement ###';
            }
            ntStatement = ntStatement.replace(',','');
            fs.appendFile(outFileTests, `${pathWithinDir},${fileNameOnly},${testType},${ntCounter},${lineNumber},Necessary,${ntStatement},${describeStatement}\n`, function (err) {
                if (err) {
                    return console.log("Error appending file: " + err);
                }
            });
        }
    }).on('close', () => {
        var testsInFile = {
            itCount: itCounter,
            ntCount: ntCounter
        };
        callback(testsInFile);
      });
}

//add file write error handling - Done