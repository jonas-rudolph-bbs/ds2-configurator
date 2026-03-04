import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type UploadSubmit =
  | { kind: 'file'; file: File }
  | { kind: 'paste'; payload: any };

@Component({
  standalone: true,
  selector: 'ds2-profiling-upload',
  imports: [CommonModule, FormsModule],
  templateUrl: './profiling-upload.component.html',
})
export class ProfilingUploadComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() submitUpload = new EventEmitter<UploadSubmit>();

  readonly mode = signal<'file' | 'paste'>('file');

  private readonly _file = signal<File | null>(null);
  readonly selectedFile = this._file.asReadonly();
  readonly selectedFileName = signal<string | null>(null);

  pasted = '';

  onFileChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this._file.set(file);
    this.selectedFileName.set(file ? file.name : null);
  }

  submitFile() {
    const file = this._file();
    if (!file) return;
    this.submitUpload.emit({ kind: 'file', file });
  }

  submitPasted() {
    const payload = JSON.parse(this.pasted);
    this.submitUpload.emit({ kind: 'paste', payload });
  }
}
