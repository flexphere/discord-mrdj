import Discord from 'discord.js';
import { Base } from './discordUtil/Base';
import { Bot, Command, Listen } from './discordUtil/Decorator';
import HelpText from './HelpText';
const qs = require('querystring');
const ytdl = require('ytdl-core');
const yts = require('yt-search');

type RequiredAndNotNull<T> = {
    [P in keyof T]-?: Exclude<T[P], null | undefined>
}

type RequireAndNotNullSome<T, K extends keyof T> = 
    RequiredAndNotNull<Pick<T, K>> & Omit<T, K>;

type Message = RequireAndNotNullSome<Discord.Message, 'member' | 'channel'>
interface Video {
    channel: Discord.VoiceChannel;
    source: YoutubeVideo;
}
interface YoutubeVideo {
    title: string;
    timestamp: string;
    url: string;
}

interface channelInfo {
    id: string;
    playlist: Video[];
    playing: boolean;
}

@Bot()
export class MrDJ extends Base {
    messageId: string = "";
    channels:channelInfo[] = [];

    @Command('!dj reboot')
    async reboot() {
        process.exit(0);
    }

    @Command('!dj help')
    async help(message: Message) {
        if (!(message.channel instanceof Discord.TextChannel)) {
            return;
        }
        return this.flashMessage(message.channel, HelpText, 20000);
    }

    @Command('!dj leave')
    async leave(message: Message) {
        const conn = this.client.voice?.connections.find(v => v.channel.id === message.member.voice.channel?.id)
        conn?.disconnect();

        this.channels = this.channels.filter((channel:channelInfo) => {
            return channel.id != message.member.voice.channel?.id
        })
    }

    @Command('!dj skip')
    async skip(message: Message) {
        if ( ! message.member.voice.channel) {
            return;
        }
        const channel = this.getOrCreateChannelInfo(message.member.voice.channel.id)
        this.play(channel);
    }

    @Command('!dj play')
    async cmdPlay(message: Message, ...args: string[]) {
        if ( ! message.member.voice.channel) {
            return;
        }

        const channel = this.getOrCreateChannelInfo(message.member.voice.channel.id);

        const url = args.join(" ");
        if (!url.startsWith('https://www.youtube.com') && !url.startsWith('https://music.youtube.com') && !url.startsWith('https://youtu.be')) {
            return;
        }

        if (url.indexOf('?') === -1) {
            return;
        }

        const params = qs.parse(url.split('?')[1]);
        if (params.list) {
            const list = await yts({listId: params.list}).catch(() => null);
            for (const videoInfo of list.videos) {
                const video = await yts({videoId: videoInfo.videoId}).catch(() => null);
                if (video) {
                    channel.playlist.push({channel: message.member.voice.channel, source: video});
                }
            }
        } else {
            const video = await yts({videoId: params.v}).catch(() => null);
            if (video) {
                channel.playlist.push({channel: message.member.voice.channel, source: video});
            }
        }

        if ( ! channel.playing) {
            this.play(channel);
        }
    }

    @Command('!dj list')
    async cmdList(message: Message) {
        if (!(message.channel instanceof Discord.TextChannel)) {
            return;
        }

        if ( ! message.member.voice.channel) {
            return;
        }

        const channel = this.getChannelInfo(message.member.voice.channel.id);
        if ( ! channel) {
            return;
        }

        if ( ! channel.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }

        const embed = new Discord.MessageEmbed()
            .setTitle('再生待ち一覧')
            .setColor(0xf8e71c)
            .setDescription(channel.playlist.map((v, i) => {
                return `[${i}]  ${v.source.title}（${v.source.timestamp}）`;
            }).join("\n"));

        return this.flashMessage(message.channel, embed, 10000);
    }

    @Command('!dj clear')
    async cmdClear(message: Message) {
        if (!(message.channel instanceof Discord.TextChannel)) {
            return;
        }

        if ( ! message.member.voice.channel) {
            return;
        }

        const channel = this.getChannelInfo(message.member.voice.channel.id);
        if ( ! channel) {
            return;
        }

        channel.playlist = [];
    }

    async play(channel:channelInfo) {
        try {
            const video = channel.playlist.shift();
            if ( ! video) {
                return;
            }

            const conn = await video.channel.join();
            if ( ! conn) {
                return;
            }
            
            const stream = ytdl(video.source.url, { filter: 'audioonly', highWaterMark: 1 << 25, });
            const dispatcher = conn.play(stream);
            channel.playing = true;

            dispatcher.on('finish', () => {
                channel.playing = false;
                this.play(channel);
            });
        } catch (e) {
            console.log(e);
        }
    }

    async flashMessage(channel: Discord.TextChannel | Discord.DMChannel, context: string | Discord.MessageEmbed, duration: number = 5000) {
        const message = await channel.send(context);
        message.delete({timeout: duration});
        return message;
    }

    getOrCreateChannelInfo(channel_id: string) {
        let channel = this.getChannelInfo(channel_id);
        if ( ! channel) {
            channel = {
                id: channel_id,
                playlist: [],
                playing: false
            };
            this.channels.push(channel);
        }
        return channel;
    }

    createChannelInfo(channel_id: string) {
        this.channels.push({
            id: channel_id,
            playlist: [],
            playing: false
        });
    }

    getChannelInfo(channel_id: string) {
        return this.channels.find((channel) => channel.id === channel_id);
    }
}