import { cva, type VariantProps } from 'class-variance-authority';

// Define a type-only version of buttonVariants to extract types.
// This ensures consistency with the actual buttonVariants in Button.svelte
// without duplicating the full CVA implementation logic.
const buttonVariantsType = cva('', {
  variants: {
    variant: {
      default: '', destructive: '', outline: '', secondary: '', ghost: '', link: '',
      legal: '', evidence: '', case: '', success: '', yorha: '', neural: ''
    },
    size: {
      default: '', sm: '', lg: '', icon: '', icon_sm: '', icon_lg: '', xs: ''
    }
  }
});

export type ButtonVariant = VariantProps<typeof buttonVariantsType>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariantsType>['size'];
