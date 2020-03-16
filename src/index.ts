import Discord from 'discord.js';
import { Config } from './lib/Config'
import { Control } from './lib/discordUtil/Control';
import { MrDJ } from './lib/MrDJ';

const client = new Discord.Client();
const controller = new Control(client, Config.token);
controller.use(MrDJ);
controller.start();