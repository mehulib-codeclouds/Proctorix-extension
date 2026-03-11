import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((_, context) => {
  const gqlContext = GqlExecutionContext.create(context);
  const { req } = gqlContext.getContext();

  return req.user;
});
