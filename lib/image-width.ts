/** Safe optional display width encoded in a Markdown image title.
 * Percentages alone are allowed; ordinary titles remain unchanged.
 */
export function imageWidthPercentage(title:string|undefined):number|null {
 if(typeof title!=="string")return null;
 const match=/^width=(100|[1-9][0-9]?)%$/.exec(title);
 return match?Number(match[1]):null;
}
