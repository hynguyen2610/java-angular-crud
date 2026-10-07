import { Validators } from '@angular/forms';

/** Keep browser validation aligned with the API and database username limit. */
export const profileValidators = {
  username: [Validators.required, Validators.maxLength(100)],
};
