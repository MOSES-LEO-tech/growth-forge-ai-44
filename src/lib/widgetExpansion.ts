/**
 * Expansion rules for ExpandableWidget.
 *
 * The bug these functions exist to prevent: `defaultExpanded` was wired to the
 * dialog's open state, so any page that passed it — the parent workspace, every
 * admin tab — opened a full-screen modal on mount. Parents signing in landed on
 * a notifications dialog instead of their workspace.
 *
 * `defaultExpanded` therefore means "the card body starts showing the expanded
 * content, inline". Only explicit control (`expanded` prop) may open a dialog on
 * mount; a dialog otherwise requires a user action.
 */

export interface ExpansionInputs {
  /** Controlled dialog state, supplied by a parent component. */
  controlledOpen?: boolean;
  /** The card should start with its expanded content visible, inline. */
  defaultExpanded?: boolean;
}

/** True only when a parent component explicitly asks for the dialog. */
export function opensDialogOnMount({ controlledOpen }: ExpansionInputs): boolean {
  return controlledOpen === true;
}

/** True when the card body should render expanded content instead of the teaser. */
export function bodyStartsExpanded({ defaultExpanded }: ExpansionInputs): boolean {
  return defaultExpanded === true;
}
