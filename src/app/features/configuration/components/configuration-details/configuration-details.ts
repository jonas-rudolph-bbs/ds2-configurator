import { Component, Input} from '@angular/core';
import { TopicDefinition } from '../../services/configuration.types';
import { KeyValuePipe } from '@angular/common';



@Component({
  selector: 'app-configuration-details',
  imports: [KeyValuePipe],
  standalone: true,
  templateUrl: './configuration-details.html',
  styles: ``
})
export class ConfigurationDetails {

  @Input() topic?: TopicDefinition;







}
