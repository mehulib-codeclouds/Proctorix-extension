import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsPort } from 'class-validator';

@Configuration()
export class AppConfiguration {
  @IsNotEmpty()
  @IsPort()
  @Value('PORT')
  port: string;
}
