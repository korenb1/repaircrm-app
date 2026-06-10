import type { SvgIconProps } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import FlagIcon from "@mui/icons-material/Flag";
import BoltIcon from "@mui/icons-material/Bolt";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import PersonIcon from "@mui/icons-material/Person";
import BuildIcon from "@mui/icons-material/Build";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import LabelIcon from "@mui/icons-material/Label";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// String-keyed icons for saved filters. The key is what gets stored in
// ticket_filters.icon; the component is rendered in chips and the picker.
export const FILTER_ICONS: Record<string, React.ComponentType<SvgIconProps>> = {
  label: LabelIcon,
  star: StarIcon,
  flag: FlagIcon,
  bolt: BoltIcon,
  bookmark: BookmarkIcon,
  person: PersonIcon,
  build: BuildIcon,
  warning: WarningAmberIcon,
  schedule: ScheduleIcon,
  priority: PriorityHighIcon,
  favorite: FavoriteIcon,
  done: CheckCircleIcon,
};

export const FILTER_ICON_KEYS = Object.keys(FILTER_ICONS);

// Resolve an icon key to its component, falling back to a neutral label icon.
export function filterIcon(key: string | null | undefined) {
  return (key && FILTER_ICONS[key]) || FILTER_ICONS.label;
}
