import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { SectionService } from '../../../core/services/section.service';
import { CourseResult } from '../../../core/models/course.model';
import { SectionResult } from '../../../core/models/section.model';
import { ActivityResult } from '../../../core/models/activity.model';
import { ActivityDetail } from '../../../shared/ui/activity-detail/activity-detail';

@Component({
  selector: 'app-estudiante-course-detail',
  imports: [RouterLink, DatePipe, ActivityDetail],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class EstudianteCourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly sectionService = inject(SectionService);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;

  protected readonly course = signal<CourseResult | null>(null);
  protected readonly isLoadingCourse = signal(true);
  protected readonly courseErrorMessage = signal<string | null>(null);

  protected readonly sections = signal<SectionResult[]>([]);
  protected readonly isLoadingSections = signal(true);

  protected readonly activitiesBySection = signal<Record<string, ActivityResult[]>>({});
  protected readonly loadingActivitiesForSectionId = signal<string | null>(null);
  protected readonly expandedSectionId = signal<string | null>(null);

  protected readonly selectedActivity = signal<ActivityResult | null>(null);

  constructor() {
    this.loadCourse();
    this.loadSections();
  }

  private loadCourse(): void {
    this.courseService.getById(this.courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.isLoadingCourse.set(false);
      },
      error: () => {
        this.courseErrorMessage.set('No se pudo cargar el curso.');
        this.isLoadingCourse.set(false);
      },
    });
  }

  private loadSections(): void {
    this.isLoadingSections.set(true);
    this.courseService.getSections(this.courseId).subscribe({
      next: (sections) => {
        this.sections.set(sections);
        this.isLoadingSections.set(false);
      },
      error: () => this.isLoadingSections.set(false),
    });
  }

  toggleSection(sectionId: string): void {
    if (this.expandedSectionId() === sectionId) {
      this.expandedSectionId.set(null);
      return;
    }

    this.expandedSectionId.set(sectionId);
    if (!this.activitiesBySection()[sectionId]) {
      this.loadingActivitiesForSectionId.set(sectionId);
      this.sectionService.getActivities(sectionId).subscribe((activities) => {
        this.activitiesBySection.update((map) => ({ ...map, [sectionId]: activities }));
        this.loadingActivitiesForSectionId.set(null);
      });
    }
  }

  openActivity(activity: ActivityResult): void {
    this.selectedActivity.set(activity);
  }

  closeActivity(): void {
    this.selectedActivity.set(null);
  }

  isOverdue(dueDateUtc: string): boolean {
    return new Date(dueDateUtc).getTime() < Date.now();
  }
}
