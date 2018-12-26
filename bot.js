const Discord = require("discord.js");
const YTDL = require("ytdl-core");
const https = require('https');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "!";

const ytImgHead = 'https://i.ytimg.com/vi/'
const ytImgFoot = '/maxresdefault.jpg'

const ytTOKEN = process.env.YOUTUBE_TOKEN;

const ytApiHead = 'https://www.googleapis.com/youtube/v3/videos?id='
const ytApiFoot = '&key=' + ytTOKEN + '&fields=items(id,snippet(channelTitle,title,thumbnails),statistics)&part=snippet,contentDetails,statistics'

const whiteList = [{
        id: 258536272308469770,
    }, {
        id: 275937829488427009,
    },
    {
        id: 518762562179825675,
    }
]

const VC = 258537886641684480;

let volume = 0.05;

let now = ""

function getYouTubeVideoId(string) {
    if (typeof string !== 'string') {
        throw new TypeError('First argument must be a string.');
    }
    let ytRegex = /(youtube\.com\/watch\?v=|youtu\.be\/)([0-9A-Za-z_-]){1,20}/;
    let match = string.match(ytRegex);
    return match[0].replace(/youtube\.com\/watch\?v=|youtu\.be\//, "");
}

function play(connection, message) {
    var server = servers[message.guild.id];
    now = server.queue[0];
    server.dispatcher = connection.playStream(YTDL(server.queue[0], {
        filter: "audioonly"
    }));
    server.dispatcher.setVolume(volume);
    server.queue.shift();
    server.dispatcher.on("end", function () {
        if (server.queue[0]) play(connection, message);
        else {
            connection.disconnect();
            now = "";
        }
    });
}

var bot = new Discord.Client();

var servers = {};

bot.on("ready", function () {
    bot.user.setStatus("ready");
    console.log("PRODMAN READY");
});

bot.on("message", function (message) {
    if (!whiteList.find(e => {
            return e.id == message.guild.id
        })) return;

    if (message.author.equals(bot.user)) return;

    if (!message.content.startsWith(PREFIX)) return;

    var args = message.content.substring(PREFIX.length).split(" ");
    switch (args[0].toLowerCase()) {
        case "play":
            {
                if (!args[1]) {
                    message.channel.send("Link Error");
                    break;
                }
                console.log(Date(Date.now()).toString() + " Request Received: " + args[1]);
                if (!servers[message.guild.id]) {
                    servers[message.guild.id] = {
                        queue: []
                    }
                }
                let server = servers[message.guild.id];
                server.queue.push(args[1]);
                if (!message.guild.voiceConnection) {
                    message.guild.channels.forEach((channel, i, arr) => {
                        if (channel.type == "voice" && parseInt(channel.id) === VC) {
                            channel.join().then(function (connection) {
                                play(connection, message);
                            });
                        }
                    });
                }
                break;
            }
        case "skip":
            {
                let server = servers[message.guild.id];
                if (server.dispatcher) server.dispatcher.end();
                break;
            }
        case "kill":
            {
                let server = servers[message.guild.id];

                if (message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
                break;
            }
        case "list":
            {
                let embed = new Discord.RichEmbed();
                if (!servers[message.guild.id]) {
                    servers[message.guild.id] = {
                        queue: []
                    }
                }
                let server = servers[message.guild.id];
                if (server.queue.length !== 0) {
                    https.get(ytApiHead + server.queue.map(getYouTubeVideoId).join(',') + ytApiFoot, (res) => {
                        let body = '';
                        res.setEncoding('utf8');
                        res.on('data', (chunk) => {
                            body += chunk;
                        });
                        res.on('end', (res) => {
                            JSON.parse(body).items.map((e, i, arr) => {
                                embed.addField(i + 1, e.snippet.title);
                            });
                            message.channel.send(embed);
                        });

                    }).on('error', (e) => {
                        console.error(e);
                    });
                } else {
                    message.channel.send("Error: Empty Queue");
                }

                break;
            }
        case "del":
            {
                if (!args[1] || parseInt(args[1]) < 1) {
                    message.channel.send("Invailed Index");
                    break;
                }
                let server = servers[message.guild.id];
                if (server.queue.length < parseInt(args[1])) {
                    message.channel.send("Invailed Index");
                    break;
                }
                delete server.queue[parseInt(args[1])];
                break;
            }
        case "volume":
            {
                if (!args[1] || parseInt(args[1]) > 100 || parseInt(args[1]) < 0) {
                    message.channel.send("Invailed command");
                    break;
                }

                if (!servers[message.guild.id]) {
                    message.channel.send("No Sound Output");
                }
                let server = servers[message.guild.id];
                switch (args[1]) {
                    case "max":
                        {
                            volume = 1;
                            break;
                        }
                    case "min":
                        {
                            volume = 0.05;
                            break;
                        }
                    case "mute":
                        {
                            volume = 0;
                            break;
                        }
                    default:
                        {
                            volume = parseInt(args[1]) / 100;
                            break;
                        }
                }
                server.dispatcher.setVolume(volume);
                break;
            }
        case "now":
            {
                if (now !== "") {
                    https.get(ytApiHead + getYouTubeVideoId(now) + ytApiFoot, (res) => {
                        let body = '';
                        res.setEncoding('utf8');
                        res.on('data', (chunk) => {
                            body += chunk;
                        });
                        res.on('end', (res) => {
                            let embed = new Discord.RichEmbed();
                            JSON.parse(body).items.map((e, i, arr) => {
                                embed.addField(now, e.snippet.title);
                            });
                            message.channel.send(embed);
                        });
                    }).on('error', (e) => {
                        console.error(e);
                    });
                }
                break;
            }
        case "help":
            {
                let embed = new Discord.RichEmbed()
                    .addField(PREFIX + "play <YOUTUBE URL>", "-----------プレイキューに音楽を加え入れる")
                    .addField(PREFIX + "skip", "-----------現在再生している音楽を飛ばす")
                    .addField(PREFIX + "now", "-----------現在再生している音楽を表示する")
                    .addField(PREFIX + "list", "-----------再生キューを表示する")
                    .addField(PREFIX + "del  <番号>", "-----------キューのn番目を削除する")
                    .addField(PREFIX + "volume <0 - 100 | max | min | mute >", "-----------ボリューム調整 デフォルトはmin (数値では5)")
                    .addField(PREFIX + "help", "-----------これ")
                    .addField(PREFIX + "kill", "-----------※<危険>絶対に使うな<危険>※")
                    .setColor(0x00FFFF)
                    .setFooter("音楽botくん取扱説明書")
                message.channel.send(embed);
                break;
            }
        default:
            return;
    }
});

bot.login(TOKEN);