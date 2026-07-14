import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsNotBefore(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isNotBefore',
      target: object.constructor,
      propertyName: propertyName.toString(),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const relatedValue = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];

          if (!(value instanceof Date) || !(relatedValue instanceof Date)) {
            return true;
          }

          return value.getTime() >= relatedValue.getTime();
        },
        defaultMessage(args: ValidationArguments): string {
          return `"${args.property}" cannot be earlier than "${String(args.constraints[0])}".`;
        },
      },
    });
  };
}
