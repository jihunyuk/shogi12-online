import Phaser from 'phaser';

export const GAME_WIDTH  = 360;
export const GAME_HEIGHT = 640;

export function buildPhaserConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width:      GAME_WIDTH,
    height:     GAME_HEIGHT,
    antialias:  true,
    render: {
      antialias:    true,
      antialiasGL:  true,
      roundPixels:  true,
      pixelArt:     false,
    },
    dom: {
      createContainer: true
    },
    backgroundColor: '#1e0f07',
    parent: 'game-container',
    scale: {
      mode:       Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}
