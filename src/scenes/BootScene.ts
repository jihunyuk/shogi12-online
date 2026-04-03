import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // No external assets — all graphics drawn procedurally
  }

  create(): void {
    this.scene.start('Menu');
  }
}
