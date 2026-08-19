import { Component, inject } from '@angular/core';
import { Shell } from './shared/layout/shell/shell';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [Shell],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Se inyecta acá (no en algún componente hijo) para aplicar el tema apenas arranca
  // la app, antes de pintar cualquier pantalla -- si no, se ve un flash en claro.
  private readonly themeService = inject(ThemeService);
}
