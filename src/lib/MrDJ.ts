import Discord from 'discord.js';
import { Base } from './discordUtil/Base';
import { Bot, Command, Listen } from './discordUtil/Decorator';
import { Alphabet } from './Emoji';
import { Connection } from './DB';
const qs = require('querystring');
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
    playindex: number = -1;
    playing: boolean = false;
    connection!: Discord.VoiceConnection;

    @Command('!mrdj reboot')
    async reboot(message: Discord.Message, ...args: string[]) {
        await this.flashMessage(message.channel, `bye`);
        process.exit(0);
    }

    @Command('!mrdj help')
    async help(message: Discord.Message, ...args: string[]) {
        return this.flashMessage(message.channel, `**Usage**
\`\`\`
曲のリクエスト:
!mrdj play [検索キーワード or YoutubeURL]

次のリクエストを再生:
!mrdj skip

リクエスト一覧:
!mrdj list

リクエストを全て削除:
!mrdj clear

リクエストを削除:
!mrdj delete [リクエストリスト一覧で表示されたID]

リクエストランキング:
!mrdj ranking

---

お気に入りとして現在のリクエスト一覧を保存:
!mrdj fav save [保存する名前]

お気に入り一覧:
!mrdj fav list

お気に入りの内容確認:
!mrdj fav info [お気に入り一覧で表示されたID]

お気に入りを再生:
!mrdj fav load [お気に入り一覧で表示されたID]
\`\`\`
        `, 20000);
    }

    @Command('!mrdj fav list')
    async cmdFavList(message: Discord.Message, ...args: string[]) {
        const db = await Connection();
        const rows = await db.query('select * from playlist');
        const embed = new Discord.MessageEmbed()
        .setTitle('お気に入り一覧')
        .setColor(0xf8e71c)
        .setDescription(rows.map((r: any, i: number) => {
            return `[${r.id}]  ${r.title}`;
        }).join("\n"));

        return this.flashMessage(message.channel, embed, 10000);
    }

    @Command('!mrdj fav info')
    async cmdFavDescribe(message: Discord.Message, ...args: string[]) {
        const id = Number(args.join(""));
        const db = await Connection();
        const rows = await db.query('select * from playlist where id = ?', [id]);
        if ( ! rows.length) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡見っかんなかった");
        }
        const row = rows.shift()
        const data = JSON.parse(row.data);

        const embed = new Discord.MessageEmbed()
        .setTitle(row.title)
        .setColor(0xf8e71c)
        .setDescription(data.map((r: SearchResult) => {
            return `${r.video.title}（${r.video.timestamp}）`;
        }).join("\n"));

        return this.flashMessage(message.channel, embed, 10000);
    }

    @Command('!mrdj fav save')
    async cmdFavSave(message: Discord.Message, ...args: string[]) {
        const title = args.join("");
        if (!title) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡名前を決めてくれーい");
        }

        const data = JSON.stringify(this.playlist);

        const db = await Connection();
        await db.query('insert into playlist (title, data) values (?, ?) ', [title, data]);

        return this.flashMessage(message.channel, "(*'ω')b+ 保存したよ！");
    }

    @Command('!mrdj fav load')
    async cmdFavLoad(message: Discord.Message, ...args: string[]) {
        const id = Number(args.join(""));

        if (id === NaN) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡数字を入力してくれーい");
        }

        const db = await Connection();
        const rows = await db.query('select * from playlist where id = ?', [id]);
        if ( ! rows.length) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡見っかんなかった");
        }

        const row = rows.shift()
        this.playlist = JSON.parse(row.data);
        this.playindex = -1;
        this.play();

        return this.flashMessage(message.channel, "(*'ω')b+ OK！");
    }

    @Command('!mrdj ranking')
    async cmdRanking(message: Discord.Message, ...args: string[]) {
        const db = await Connection();
        const rows = await db.query('select title, count(*) as cnt  from history group by title order by cnt desc limit 10;');

        const embed = new Discord.MessageEmbed()
            .setTitle('ランキング')
            .setColor(0xf8e71c)
            .setDescription(rows.map((r: any, i: number) => {
                return `#${i} ${r.title}（${r.cnt}）`;
            }).join("\n"));

        return this.flashMessage(message.channel, embed, 10000);        
    }

    @Command('!mrdj skip')
    async cmdSkip(message: Discord.Message, ...args: string[]) {
        if ( ! this.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }
        this.play();
    }

    @Command('!mrdj list')
    async cmdList(message: Discord.Message, ...args: string[]) {
        if ( ! this.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }
        const embed = new Discord.MessageEmbed()
            .setTitle('リクエスト一覧')
            .setColor(0xf8e71c)
            .setDescription(this.playlist.map((r, i) => {
                const emoji = i === this.playindex ? '🎶' : '➖';
                return `[${i}]  ${r.video.title}（${r.video.timestamp}）`;
            }).join("\n"));

        return this.flashMessage(message.channel, embed, 10000);
    }

    @Command('!mrdj delete')
    async cmdDelete(message: Discord.Message, ...args: string[]) {
        if ( ! this.playlist.length) {
            return this.flashMessage(message.channel, "('A`)空っぽ ");
        }

        const id = Number(args.join(""));
        if (id === NaN) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡数字を入力してくれーい");
        }

        if ( ! this.playlist[id]) {
            return this.flashMessage(message.channel, "｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡その数字無理");
        }

        this.playlist.splice(id, 1);

        return this.flashMessage(message.channel, "(*'ω')b+ OK！");
    }

    @Command('!mrdj clear')
    async cmdClear(message: Discord.Message, ...args: string[]) {
        this.playindex = 0;
        this.playlist = [];
        return this.flashMessage(message.channel, "('A`)空っぽ ");
    }

    @Command('!mrdj play')
    async cmdPlay(message: Discord.Message, ...args: string[]) {
        const param = args.join(" ");
        if (param.startsWith('https://www.youtube.com')) {
            return this.playFromURL(param, message);
        }
        return this.playFromQuery(param, message)
    }

    @Listen('messageReactionAdd')
    async reaction(reaction: Discord.MessageReaction, user: Discord.User) {
        try {
            if (user.bot) {
                return;
            }

            if (reaction.message.id !== this.messageId) {
                return;
            }

            const member = reaction.message.guild?.member(user);
            if ( ! member) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡あんた誰・・`);
            }

            if ( ! member.voice.channel) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡音声チャンネルに入ってからやってくれい`);
            }
    
            const result = this.searchResults.find(r => r.emoji === reaction.emoji.name);
            if (result === undefined) {
                return this.flashMessage(reaction.message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめんうそ。そんな動画なかった`);
            }

            this.connection = await member.voice.channel?.join();
            if ( ! this.connection) {
                return;
            }

            this.playlist.push(result);

            const db = await Connection();
            await db.query('INSERT INTO history (url, title) values (?, ?)', [result.video.url, result.video.title]);

            if ( ! this.playing) {
                this.play();
            } else {
                return this.flashMessage(reaction.message.channel, `(*'ω')b+ OK！`);
            }
        } catch (e) {
            console.error(e);
            reaction.message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async playFromURL(url: string, message: Discord.Message) {
        try {
            let videoID = "";

            if (url.indexOf('?') !== -1) {
                const params = qs.parse(url.split('?')[1]);
                videoID = params.v;
            }

            if (videoID === "") {
                return;
            }

            if ( ! this.connection) {
                const member = message.guild?.member(message.author);
                if ( ! member) {
                    return this.flashMessage(message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡あんた誰・・`);
                }

                if ( ! member.voice.channel) {
                    return this.flashMessage(message.channel, `｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡音声チャンネルに入ってからやってくれい`);
                }

                this.connection = await member.voice.channel?.join();
                if ( ! this.connection) {
                    return;
                }
            }

            const v = await yts({videoId:videoID});
            this.playlist.push({ emoji: '', video: v });

            const db = await Connection();
            await db.query('INSERT INTO history (url, title) values (?, ?)', [v.url, v.title]);
            
            if (this.playing) {
                return this.flashMessage(message.channel, `(*'ω')b+ OK！`);    
            }

            return this.play();
        } catch (e) {
            console.error(e);
            message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async playFromQuery(searchKeyword: string, message: Discord.Message) {
        try {
            const r = await yts(searchKeyword);
            if ( ! r?.videos) {
                return this.flashMessage(message.channel, '｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。動画みっかんなかった');
            }

            this.searchResults = r.videos.slice(0, 5).map((v:YoutubeVideo, i:number) => {
                return { emoji: Alphabet[i], video: v };
            });
    
            const embed = new Discord.MessageEmbed()
                .setTitle('検索結果一覧')
                .setColor(0xf8e71c)
                .setDescription(this.searchResults.map(r => `${r.emoji} ${r.video.title}（${r.video.timestamp}）`).join("\n"));
    
            const botMessage = await this.flashMessage(message.channel, embed, 10000);
            this.messageId = botMessage.id;
            this.searchResults.forEach(async(r) => {
                await botMessage.react(r.emoji);
            });
        } catch (e) {
            console.error(e);
            message.channel.send('｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡ごめん。エラーだわ');
        }
    }

    async play() {
        try {
            if (this.playlist.length < 1) {
                return;
            }

            this.playindex++;
            const queue = this.playlist[this.playindex];
            if ( ! queue) {
                this.playindex = -1;
                this.play();
                return;
            }

            this.client.user?.setActivity(`🎶 Now Playing... ${queue.video.title}\n${queue.video.url}`);
            this.playing = true;
            const stream = ytdl(queue.video.url, { filter: 'audioonly', highWaterMark: 1 << 25, });
            const dispatcher = this.connection.play(stream);
            dispatcher.on('finish', () => {
                this.playing = false;
                this.play();
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
}