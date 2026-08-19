import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'cursos',
    children: [
      {
        path: '',
        loadComponent: () => import('./features/cursos/lista/lista').then((m) => m.CursosPublicos),
      },
      {
        path: ':courseId',
        loadComponent: () => import('./features/cursos/detalle/detalle').then((m) => m.CursoPublico),
      },
    ],
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'profesor',
    canActivate: [authGuard, roleGuard(['Profesor', 'Administrador'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/profesor/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'cursos/nuevo',
        loadComponent: () =>
          import('./features/profesor/course-create/course-create').then((m) => m.CourseCreate),
      },
      {
        path: 'cursos/:courseId',
        loadComponent: () =>
          import('./features/profesor/course-detail/course-detail').then((m) => m.CourseDetail),
      },
      {
        path: 'cursos/:courseId/inscripciones',
        loadComponent: () =>
          import('./features/profesor/enrollments/enrollments').then((m) => m.Enrollments),
      },
      {
        path: 'cursos/:courseId/fichas',
        loadComponent: () => import('./features/profesor/cohorts/cohorts').then((m) => m.Cohorts),
      },
      {
        path: 'cursos/:courseId/configuracion',
        loadComponent: () =>
          import('./features/profesor/course-settings/course-settings').then((m) => m.CourseSettings),
      },
      {
        path: 'actividades/:activityId/entregas',
        loadComponent: () =>
          import('./features/profesor/activity-submissions/activity-submissions').then(
            (m) => m.ActivitySubmissions,
          ),
      },
    ],
  },
  {
    path: 'estudiante',
    canActivate: [authGuard, roleGuard(['Estudiante'])],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/estudiante/cursos/cursos').then((m) => m.EstudianteCursos),
      },
      {
        path: 'cursos/:courseId',
        loadComponent: () =>
          import('./features/estudiante/course-detail/course-detail').then((m) => m.EstudianteCourseDetail),
      },
    ],
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'actividades/:activityId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/actividad/actividad').then((m) => m.Actividad),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
