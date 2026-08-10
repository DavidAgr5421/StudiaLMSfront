import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
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
        path: 'actividades/:activityId/entregas',
        loadComponent: () =>
          import('./features/profesor/activity-submissions/activity-submissions').then(
            (m) => m.ActivitySubmissions,
          ),
      },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
