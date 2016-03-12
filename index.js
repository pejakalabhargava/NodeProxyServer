/**
 * Created by bkakran on 3/9/16.
 */
"use strict"
let http = require('http')
let request = require('request')
let argv = require('yargs')
    .usage('Usage: node index.js --log [logFile] --loglevel [LOG_LEVEL] --exec [Command] ')
    .example('node index.js --log text --loglevel 6')
    .example('node index.js --exec ls')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2016')
    .default('host', '127.0.0.1')
    .argv
let path = require('path')
let fs = require('fs')
let child_process = require('child_process');
let stream = require('stream');

let scheme = 'http://'
let port = argv.port || (argv.host === '127.0.0.1' ? 8000 : 80)
let destinationUrl = argv.url || scheme + argv.host + ':' + port

let logPath = argv.log && path.join(__dirname, argv.log)
let getLogStream = ()=> logPath ? fs.createWriteStream(logPath) : process.stdout
let logStream = logPath ? fs.createWriteStream(logPath) : process.stdout

let logLevel = argv.loglevel || 6;

let logLevelMap = {
    1: "ALERT",
    2: "CRITICAL",
    3: "ERROR",
    4: "WARNING",
    5: "NOTICE",
    6: "INFO",
    7: "DEBUG"
}
let exec = argv.exec;
if (argv.exec) {
    var child = child_process.spawn(argv.exec, argv._);

    child.stdout.on('data',
        function (data) {
            log(6, 'Output is :\n' + data);

        }
    );
    child.stderr.on('data',
        function (data) {
            log(3, 'Error: ' + data);
        }
    );
    child.on('close', function (status) {
        log(6, 'Child process exited with status ' + status);
    });
} else {
    http.createServer((req, res) => {
        log(6,`Request received at: ${req.url}`)
        //res.end('hello world\n')
        log(6,'Request headers:' + JSON.stringify(req.headers))
        log(6,req)
        req.pipe(res)
        for (let header in req.headers) {
            res.setHeader(header, req.headers[header])
        }
    }).listen(8000)

    http.createServer((req, res) => {
        //Proxy code
        destinationUrl = req.headers['x-destination-url'] || destinationUrl
        log(6,'Destination URL:' + destinationUrl)
        let options = {
            headers: req.headers,
            url: `${destinationUrl}${req.url}`
        }
        options.method = req.method
        log(6,'Destination method:' + req.method)
        let downstreamResponse = req.pipe(request(options))
        log(6, `Request Headers: ` + JSON.stringify(downstreamResponse.headers))
        log(6, downstreamResponse)
       downstreamResponse.pipe(res)
    }).listen(8001)
}

function log(level, msg) {
    if (level <= logLevel)
        if (logLevelMap[level]) {
            if (typeof msg === 'string') {
                logStream.write(logLevelMap[level] + ': ' + msg + '\n');
            } else if (msg instanceof stream.Stream) {
                msg.pipe(logStream, {end: false});
            }
        }

}

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}
