import { Configuration, Value } from '@itgorillaz/configify';
import { IsEnum, IsNotEmpty, IsPort, IsUrl } from 'class-validator';

@Configuration()
export class AppConfiguration {
  @IsNotEmpty()
  @IsEnum(['dev', 'prod'])
  @Value('NODE_ENV')
  nodeEnv: 'dev' | 'prod';

  @IsNotEmpty()
  @IsPort()
  @Value('PORT')
  port: string;

  @IsNotEmpty()
  @IsUrl({
    protocols: ['postgresql'],
    require_tld: false,
    require_protocol: true,
    require_host: true,
    allow_underscores: true,
  })
  @Value('DATABASE_URL')
  databaseUrl: string;
}
