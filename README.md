![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/flexphere/discord-mrdj)

# Mr.DJ
Youtubeの動画を検索して、音声をVoiceChannelで流してくれるDiscord Bot。

Discordへの招待は[こちら](https://discordapp.com/oauth2/authorize?client_id=684309132320309268&permissions=3147840&scope=bot)から！

### 使い方
1. botをサーバーに招待する
2. どこかしらのVoiceChannelに入った状態で `!mrdj play 検索キーワード` を入力するとyoutubeから検索結果を表示してくれる
3. 表示された検索結果に応じたリアクションをクリックすると、自分のいるVoiceChannelに入ってきて音声を再生してくれる（はず)

#### 使用可能コマンド一覧
|コマンド|内容
|:--|:--
|!mrdj play 検索キーワード|曲を再生 or 予約リストに追加
|!mrdj skip|次の曲を再生
|!mrdj list|予約リストを表示

