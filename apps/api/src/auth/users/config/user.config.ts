import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsString } from 'class-validator';

@Configuration()
export class UserConfiguration {
  @IsNotEmpty()
  @IsString()
  @Value('VERIFICATION_MAIL_FROM')
  verificationMailFrom: string;

  @IsNotEmpty()
  @IsString()
  @Value('VERIFICATION_LINK')
  verificationLink: string;
}
