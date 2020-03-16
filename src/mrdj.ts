import Discord from 'discord.js';
import {Base} from './lib/discordUtil/Base';
import {Bot, Command, Listen} from './lib/discordUtil/Decorator';
import {Alphabet} from './lib/Emoji';
const ytdl = require('ytdl-core');
const yts = require('yt-search');

interface YoutubeVideo {
    title: string;
    timestamp: string;
    url: string;
}

interface SearchResult {
    emoji: string;
    video: YoutubeVideo;
}

@Bot()
export class MrDJ extends Base {
    messageId: string = "";
    searchResults: SearchResult[] = [];
    playlist: SearchResult[] = [];
    playing: boolean = false;
    connection!: Discord.VoiceConnection;

    @Command('>mrdj play')
    requestPlay(message: Discord.Message, ...args: string[]) {
        this.searchAndWait(message, args);
    }

    @Listen('>mrdj skip')
    requestQueue(message: Discord.Message, ...args: string[]) {
        this.play();
    }

    @Listen('messageReactionAdd')
    async reaction(messageReaction: Discord.MessageReaction, user: Discord.User) {
        try {
            if (user.bot) {
                return;
            }

            if (messageReaction.message.id !== this.messageId) {
                console.log(`${messageReaction.message.id} !== ${this.messageId}`)
                messageReaction.message.channel.send(`｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡もっかい検索してくれい`);
                return;
            }

            const member = messageReaction.message.guild?.member(user);
            if ( ! member) {
                console.log('member is not set');
                return;
            }

            if ( ! member.voice.channel) {
                messageReaction.message.channel.send(`｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡音声チャンネルに入ってからやってくれい`);
                return;
            }
    
            const result = this.searchResults.find(r => r.emoji === messageReaction.emoji.name);
            if (result === undefined) {
                messageReaction.message.channel.send(`｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめんうそ。そんな動画なかった`);
                return;
            }

            // await messageReaction.message.delete();

            this.connection = await member.voice.channel?.join();
            if ( ! this.connection) {
                return;
            }

            this.playlist.push(result);

            const queue =this.playlist.shift();
            if ( ! queue) {
                return;
            }

            const activity = `🎶 Now Playing... ${queue.video.title}\n${queue.video.url}`;
            this.client.user?.setActivity(activity);

            // const stream = ytdl(queue.video.url, { filter: 'audioonly', highWaterMark: 1 << 25, });
            const stream = ytdl(queue.video.url);
            stream.on('error', (e:any)=>{
                console.log(e)
            })
            const dispatcher = this.connection.play(stream);
            dispatcher.on('start', () => {
                this.playing = true;
                this.connection.disconnect();
            });
            dispatcher.on('end', () => {
                this.connection.disconnect();
                this.playing = false;
                this.play();
            });

            // if ( ! this.playing) {
            //     this.play();
            // } else {
            //     messageReaction.message.channel.send(`(*'ω')b+ 予約リストに入れたよ！`);
            // }
        } catch (e) {
            console.error(e);
            messageReaction.message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async searchAndWait(message: Discord.Message, args: string[]) {
        try {
            const searchKeyword = args.join(" ");
            
            const r = await yts(searchKeyword);
            if (!r?.videos) {
                message.reply('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。動画みっかんなかった');
                return;
            }

            this.searchResults = r.videos.slice(0, 5).map((v:YoutubeVideo, i:number) => {
                return { emoji: Alphabet[i], video: v };
            });
    
            const embed = {
                title: "検索結果一覧",
                color: 0xf8e71c,
                description: this.searchResults.map(r => {
                    return `${r.emoji} ${r.video.title}（${r.video.timestamp}）`;
                }).join("\n")
            };
    
            const botMessage = await message.channel.send({ embed });
            this.messageId = botMessage.id;
            console.log(`result messageId: ${this.messageId}`);
            this.searchResults.forEach(async(r) => {
                await botMessage.react(r.emoji);
            });
        } catch (e) {
            console.error(e);
            message.reply('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async play() {
        try {
            const queue =this.playlist.shift();
            if ( ! queue) {
                return;
            }

            const activity = `🎶 Now Playing... ${queue.video.title}\n${queue.video.url}`;
            this.client.user?.setActivity(activity);

            console.log(queue); 
            const stream = ytdl(queue.video.url, { filter: 'audioonly', highWaterMark: 1 << 25, });
            console.log(stream);
            const dispatcher = this.connection.play(stream);
            dispatcher.on('start', () => {
                this.playing = true;
                this.connection.disconnect();
            });
            dispatcher.on('end', () => {
                this.connection.disconnect();
                this.playing = false;
                this.play();
            });
        } catch (e) {
            console.log(e);
        }
    }
}