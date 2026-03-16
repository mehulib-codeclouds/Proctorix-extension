import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty, IsString } from 'class-validator';

@Configuration()
export class GoogleOAuthConfiguration {
  @IsNotEmpty()
  @IsString()
  @Value('GOOGLE_CLIENT_ID')
  clientId: string;

  @IsNotEmpty()
  @IsString()
  @Value('GOOGLE_CLIENT_SECRET')
  clientSecret: string;

  @IsNotEmpty()
  @IsString()
  @Value('GOOGLE_REDIRECT_URL')
  redirectUrl: string;
}