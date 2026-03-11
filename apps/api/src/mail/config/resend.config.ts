import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsString } from 'class-validator';

@Configuration()
export class ResendConfiguration {
  @IsNotEmpty()
  @IsString()
  @Value('RESEND_API_KEY')
  apiKey: string;
}
