import Phaser from 'phaser';
import { buildPhaserConfig } from '@/config/phaserConfig';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { GameScene } from '@/scenes/GameScene';
import { RulesScene } from '@/scenes/RulesScene';
import { ResultScene } from '@/scenes/ResultScene';
import { SettingsScene } from '@/scenes/SettingsScene';

const config = buildPhaserConfig([
  BootScene,
  MenuScene,
  GameScene,
  RulesScene,
  ResultScene,
  SettingsScene,
]);

new Phaser.Game(config);
