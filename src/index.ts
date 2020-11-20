import Discord from 'discord.js';
import { Control } from './lib/discordUtil/Control';
import { MrDJ } from './lib/MrDJ';

const client = new Discord.Client();
const controller = new Control(client, process.env.DISCORD_TOKEN || '');
controller.use(MrDJ);
controller.start();