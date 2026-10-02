import { exuiTokens } from "@exre/exui/tokens";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AppWindow,
  Archive,
  ArchiveRestore,
  ArrowDownAZ,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  ArrowDownZA,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowLeftRight,
  Bold,
  Bug,
  Building2,
  CalendarDays,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsDownUp,
  CircleCheck,
  CircleHelp,
  CircleUserRound,
  Clock,
  Code,
  Columns2,
  Columns3,
  Copy,
  CopyPlus,
  CornerDownLeft,
  Download,
  Ellipsis,
  ExternalLink,
  FilePlus,
  FileText,
  FileType,
  FlaskConical,
  Folder,
  FolderInput,
  FolderOpen,
  Globe,
  GlobeLock,
  GripVertical,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  History,
  House,
  Image,
  Import,
  IndentDecrease,
  IndentIncrease,
  Info,
  Italic,
  Keyboard,
  Link,
  List,
  ListOrdered,
  ListTodo,
  LockKeyhole,
  LogOut,
  Mail,
  MailCheck,
  Maximize2,
  Menu,
  MessageSquare,
  Minimize2,
  Minus,
  Moon,
  Network,
  Palette,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTop,
  PanelsTopLeft,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Printer,
  Quote,
  Regex,
  RotateCcw,
  Replace,
  Search,
  Send,
  Share,
  SeparatorHorizontal,
  Settings,
  Shapes,
  Shuffle,
  Shield,
  Sigma,
  Smile,
  SmilePlus,
  Sparkles,
  SquarePen,
  Star,
  Strikethrough,
  Sun,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  TableOfContents,
  TextCursorInput,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  UserRoundMinus,
  Users,
  WrapText,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon as IconComponent, LucideProps } from "lucide-react";
import { forwardRef } from "react";
import styled from "styled-components";
import type { DefaultTheme } from "styled-components";

/** SVG props accepted by interactive icons while migrating Outline controls. */
export interface InteractionIconProps extends Omit<LucideProps, "size"> {
  /** An explicit size in pixels; otherwise follows the shared control icon token. */
  size?: number;
  /** Selects the open folder graphic for expanded collection controls. */
  expanded?: boolean;
  /** Selects the active graphic for archive and trash drag targets. */
  open?: boolean;
  /** Legacy Outline flag; Lucide always uses its own outline geometry. */
  outline?: boolean;
  /** Consumed locally when styled-components forwards its theme. */
  theme?: DefaultTheme;
}

/** Props for rendering a statically imported Lucide icon. */
export interface LucideIconProps extends InteractionIconProps {
  /** The Lucide component representing the control's action. */
  icon: IconComponent;
}

/**
 * Renders a Lucide control icon without forwarding Outline presentation flags.
 *
 * @param props the icon, SVG attributes and legacy presentation flags.
 * @param ref the reference to the rendered SVG element.
 * @returns the Lucide SVG element.
 */
export const LucideIcon = forwardRef<SVGSVGElement, LucideIconProps>(
  function LucideIcon(
    {
      icon: Component,
      size,
      strokeWidth = 2,
      color = "currentColor",
      expanded: _expanded,
      open: _open,
      outline: _outline,
      theme: _theme,
      ...props
    },
    ref
  ) {
    return (
      <Component
        ref={ref}
        size={size ?? exuiTokens.density.standard.iconSize}
        strokeWidth={strokeWidth}
        color={color}
        {...props}
      />
    );
  }
);

/** Lucide graphic for align center controls. */
export const AlignCenterIcon =
  /* @__PURE__ */ createInteractionIcon(AlignCenter);

/** Lucide graphic for align full width controls. */
export const AlignFullWidthIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowLeftRight);

/** Lucide graphic for align image center controls. */
export const AlignImageCenterIcon =
  /* @__PURE__ */ createInteractionIcon(AlignCenter);

/** Lucide graphic for align image left controls. */
export const AlignImageLeftIcon =
  /* @__PURE__ */ createInteractionIcon(AlignLeft);

/** Lucide graphic for align image right controls. */
export const AlignImageRightIcon =
  /* @__PURE__ */ createInteractionIcon(AlignRight);

/** Lucide graphic for align left controls. */
export const AlignLeftIcon = /* @__PURE__ */ createInteractionIcon(AlignLeft);

/** Lucide graphic for align right controls. */
export const AlignRightIcon = /* @__PURE__ */ createInteractionIcon(AlignRight);

/** Lucide graphic for archive controls. */
export const ArchiveIcon = /* @__PURE__ */ createInteractionIcon(
  Archive,
  ArchiveRestore
);

/** Lucide graphic for arrow controls. */
export const ArrowIcon = /* @__PURE__ */ createInteractionIcon(ArrowRight);

/** Lucide graphic for attachment controls. */
export const AttachmentIcon = /* @__PURE__ */ createInteractionIcon(Paperclip);

/** Lucide graphic for back controls. */
export const BackIcon = /* @__PURE__ */ createInteractionIcon(ArrowLeft);

/** Lucide graphic for beaker controls. */
export const BeakerIcon = /* @__PURE__ */ createInteractionIcon(FlaskConical);

/** Lucide graphic for block quote controls. */
export const BlockQuoteIcon = /* @__PURE__ */ createInteractionIcon(Quote);

/** Lucide graphic for bold controls. */
export const BoldIcon = /* @__PURE__ */ createInteractionIcon(Bold);

/** Lucide graphic for browser controls. */
export const BrowserIcon = /* @__PURE__ */ createInteractionIcon(AppWindow);

/** Lucide graphic for bug controls. */
export const BugIcon = /* @__PURE__ */ createInteractionIcon(Bug);

/** Lucide graphic for bulleted list controls. */
export const BulletedListIcon = /* @__PURE__ */ createInteractionIcon(List);

/** Lucide graphic for calendar controls. */
export const CalendarIcon = /* @__PURE__ */ createInteractionIcon(CalendarDays);

/** Lucide graphic for caret down controls. */
export const CaretDownIcon = /* @__PURE__ */ createInteractionIcon(ChevronDown);

/** Lucide graphic for caret up controls. */
export const CaretUpIcon = /* @__PURE__ */ createInteractionIcon(ChevronUp);

/** Lucide graphic for case sensitive controls. */
export const CaseSensitiveIcon =
  /* @__PURE__ */ createInteractionIcon(CaseSensitive);

/** Lucide graphic for checkmark controls. */
export const CheckmarkIcon = /* @__PURE__ */ createInteractionIcon(Check);

/** Lucide graphic for clock controls. */
export const ClockIcon = /* @__PURE__ */ createInteractionIcon(Clock);

/** Lucide graphic for close controls. */
export const CloseIcon = /* @__PURE__ */ createInteractionIcon(X);

/** Lucide graphic for code controls. */
export const CodeIcon = /* @__PURE__ */ createInteractionIcon(Code);

/** Lucide graphic for collapsed controls. */
export const CollapsedIcon = /* @__PURE__ */ createInteractionIcon(ChevronDown);

/** Lucide graphic for collapse controls. */
export const CollapseIcon =
  /* @__PURE__ */ createInteractionIcon(ChevronsDownUp);

/** Lucide graphic for collection controls. */
export const CollectionIcon = /* @__PURE__ */ createInteractionIcon(
  Folder,
  FolderOpen
);

/** Lucide graphic for comment controls. */
export const CommentIcon = /* @__PURE__ */ createInteractionIcon(MessageSquare);

/** Lucide graphic for copy controls. */
export const CopyIcon = /* @__PURE__ */ createInteractionIcon(Copy);

/** Lucide graphic for cross controls. */
export const CrossIcon = /* @__PURE__ */ createInteractionIcon(X);

/** Lucide graphic for disclosure controls. */
export const DisclosureIcon =
  /* @__PURE__ */ createInteractionIcon(ChevronDown);

/** Lucide graphic for document controls. */
export const DocumentIcon = /* @__PURE__ */ createInteractionIcon(FileText);

/** Lucide graphic for done controls. */
export const DoneIcon = /* @__PURE__ */ createInteractionIcon(CircleCheck);

/** Lucide graphic for download controls. */
export const DownloadIcon = /* @__PURE__ */ createInteractionIcon(Download);

/** Lucide graphic for drafts controls. */
export const DraftsIcon = /* @__PURE__ */ createInteractionIcon(SquarePen);

/** Lucide graphic for duplicate controls. */
export const DuplicateIcon = /* @__PURE__ */ createInteractionIcon(CopyPlus);

/** Lucide graphic for edit controls. */
export const EditIcon = /* @__PURE__ */ createInteractionIcon(Pencil);

/** Lucide graphic for email controls. */
export const EmailIcon = /* @__PURE__ */ createInteractionIcon(Mail);

/** Lucide graphic for embed controls. */
export const EmbedIcon = /* @__PURE__ */ createInteractionIcon(PanelsTopLeft);

/** Lucide graphic for expanded controls. */
export const ExpandedIcon = /* @__PURE__ */ createInteractionIcon(ChevronDown);

/** Lucide graphic for export controls. */
export const ExportIcon = /* @__PURE__ */ createInteractionIcon(Upload);

/** Lucide graphic for globe controls. */
export const GlobeIcon = /* @__PURE__ */ createInteractionIcon(Globe);

/** Lucide graphic for go to controls. */
export const GoToIcon = /* @__PURE__ */ createInteractionIcon(ChevronRight);

/** Lucide graphic for graph controls. */
export const GraphIcon = /* @__PURE__ */ createInteractionIcon(Network);

/** Lucide graphic for group controls. */
export const GroupIcon = /* @__PURE__ */ createInteractionIcon(Users);

/** Lucide graphic for grow controls. */
export const GrowIcon = /* @__PURE__ */ createInteractionIcon(Maximize2);

/** Lucide graphic for hashtag controls. */
export const HashtagIcon = /* @__PURE__ */ createInteractionIcon(Hash);

/** Lucide graphic for heading1 controls. */
export const Heading1Icon = /* @__PURE__ */ createInteractionIcon(Heading1);

/** Lucide graphic for heading2 controls. */
export const Heading2Icon = /* @__PURE__ */ createInteractionIcon(Heading2);

/** Lucide graphic for heading3 controls. */
export const Heading3Icon = /* @__PURE__ */ createInteractionIcon(Heading3);

/** Lucide graphic for heading4 controls. */
export const Heading4Icon = /* @__PURE__ */ createInteractionIcon(Heading4);

/** Lucide graphic for highlight controls. */
export const HighlightIcon = /* @__PURE__ */ createInteractionIcon(Highlighter);

/** Lucide graphic for history controls. */
export const HistoryIcon = /* @__PURE__ */ createInteractionIcon(History);

/** Lucide graphic for home controls. */
export const HomeIcon = /* @__PURE__ */ createInteractionIcon(House);

/** Lucide graphic for horizontal rule controls. */
export const HorizontalRuleIcon = /* @__PURE__ */ createInteractionIcon(Minus);

/** Lucide graphic for image controls. */
export const ImageIcon = /* @__PURE__ */ createInteractionIcon(Image);

/** Lucide graphic for import controls. */
export const ImportIcon = /* @__PURE__ */ createInteractionIcon(Import);

/** Lucide graphic for indent controls. */
export const IndentIcon = /* @__PURE__ */ createInteractionIcon(IndentIncrease);

/** Lucide graphic for info controls. */
export const InfoIcon = /* @__PURE__ */ createInteractionIcon(Info);

/** Lucide graphic for input controls. */
export const InputIcon = /* @__PURE__ */ createInteractionIcon(TextCursorInput);

/** Lucide graphic for insert above controls. */
export const InsertAboveIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowUpToLine);

/** Lucide graphic for insert below controls. */
export const InsertBelowIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowDownToLine);

/** Lucide graphic for insert left controls. */
export const InsertLeftIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowLeftToLine);

/** Lucide graphic for insert right controls. */
export const InsertRightIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowRightToLine);

/** Lucide graphic for internet controls. */
export const InternetIcon = /* @__PURE__ */ createInteractionIcon(Globe);

/** Lucide graphic for italic controls. */
export const ItalicIcon = /* @__PURE__ */ createInteractionIcon(Italic);

/** Lucide graphic for keyboard controls. */
export const KeyboardIcon = /* @__PURE__ */ createInteractionIcon(Keyboard);

/** Lucide graphic for link controls. */
export const LinkIcon = /* @__PURE__ */ createInteractionIcon(Link);

/** Lucide graphic for logout controls. */
export const LogoutIcon = /* @__PURE__ */ createInteractionIcon(LogOut);

/** Lucide graphic for mark as read controls. */
export const MarkAsReadIcon = /* @__PURE__ */ createInteractionIcon(MailCheck);

/** Lucide graphic for math controls. */
export const MathIcon = /* @__PURE__ */ createInteractionIcon(Sigma);

/** Lucide graphic for menu controls. */
export const MenuIcon = /* @__PURE__ */ createInteractionIcon(Menu);

/** Lucide graphic for moon controls. */
export const MoonIcon = /* @__PURE__ */ createInteractionIcon(Moon);

/** Lucide graphic for more controls. */
export const MoreIcon = /* @__PURE__ */ createInteractionIcon(Ellipsis);

/** Lucide graphic for move controls. */
export const MoveIcon = /* @__PURE__ */ createInteractionIcon(FolderInput);

/** Lucide graphic for new document controls. */
export const NewDocumentIcon = /* @__PURE__ */ createInteractionIcon(FilePlus);

/** Lucide graphic for next controls. */
export const NextIcon = /* @__PURE__ */ createInteractionIcon(ArrowRight);

/** Lucide graphic for open controls. */
export const OpenIcon = /* @__PURE__ */ createInteractionIcon(ExternalLink);

/** Lucide graphic for ordered list controls. */
export const OrderedListIcon =
  /* @__PURE__ */ createInteractionIcon(ListOrdered);

/** Lucide graphic for outdent controls. */
export const OutdentIcon =
  /* @__PURE__ */ createInteractionIcon(IndentDecrease);

/** Lucide graphic for padlock controls. */
export const PadlockIcon = /* @__PURE__ */ createInteractionIcon(LockKeyhole);

/** Lucide graphic for page break controls. */
export const PageBreakIcon =
  /* @__PURE__ */ createInteractionIcon(SeparatorHorizontal);

/** Lucide graphic for palette controls. */
export const PaletteIcon = /* @__PURE__ */ createInteractionIcon(Palette);

/** Lucide graphic for pdf controls. */
export const PDFIcon = /* @__PURE__ */ createInteractionIcon(FileType);

/** Lucide graphic for pin controls. */
export const PinIcon = /* @__PURE__ */ createInteractionIcon(Pin);

/** Lucide graphic for plus controls. */
export const PlusIcon = /* @__PURE__ */ createInteractionIcon(Plus);

/** Lucide graphic for print controls. */
export const PrintIcon = /* @__PURE__ */ createInteractionIcon(Printer);

/** Lucide graphic for profile controls. */
export const ProfileIcon =
  /* @__PURE__ */ createInteractionIcon(CircleUserRound);

/** Lucide graphic for publish controls. */
export const PublishIcon = /* @__PURE__ */ createInteractionIcon(Send);

/** Lucide graphic for question mark controls. */
export const QuestionMarkIcon =
  /* @__PURE__ */ createInteractionIcon(CircleHelp);

/** Lucide graphic for reaction controls. */
export const ReactionIcon = /* @__PURE__ */ createInteractionIcon(SmilePlus);

/** Lucide graphic for regex controls. */
export const RegexIcon = /* @__PURE__ */ createInteractionIcon(Regex);

/** Lucide graphic for replace controls. */
export const ReplaceIcon = /* @__PURE__ */ createInteractionIcon(Replace);

/** Lucide graphic for restore controls. */
export const RestoreIcon = /* @__PURE__ */ createInteractionIcon(RotateCcw);

/** Lucide graphic for return controls. */
export const ReturnIcon = /* @__PURE__ */ createInteractionIcon(CornerDownLeft);

/** Lucide graphic for search controls. */
export const SearchIcon = /* @__PURE__ */ createInteractionIcon(Search);

/** Lucide graphic for settings controls. */
export const SettingsIcon = /* @__PURE__ */ createInteractionIcon(Settings);

/** Lucide graphic for shapes controls. */
export const ShapesIcon = /* @__PURE__ */ createInteractionIcon(Shapes);

/** Lucide graphic for shield controls. */
export const ShieldIcon = /* @__PURE__ */ createInteractionIcon(Shield);

/** Lucide graphic for shrink controls. */
export const ShrinkIcon = /* @__PURE__ */ createInteractionIcon(Minimize2);

/** Lucide graphic for shuffle controls. */
export const ShuffleIcon = /* @__PURE__ */ createInteractionIcon(Shuffle);

/** Lucide graphic for sidebar controls. */
export const SidebarIcon =
  /* @__PURE__ */ createInteractionIcon(PanelLeftClose);

/** Lucide graphic for opening the sidebar. */
export const PanelLeftOpenIcon =
  /* @__PURE__ */ createInteractionIcon(PanelLeftOpen);

/** Lucide graphic for sharing a document or collection. */
export const ShareIcon = /* @__PURE__ */ createInteractionIcon(Share);

/** Lucide graphic for smiley controls. */
export const SmileyIcon = /* @__PURE__ */ createInteractionIcon(Smile);

/** Lucide graphic for sort alphabetical controls. */
export const SortAlphabeticalIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowDownAZ);

/** Lucide graphic for sort alphabetical reverse controls. */
export const SortAlphabeticalReverseIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowDownZA);

/** Lucide graphic for sort ascending controls. */
export const SortAscendingIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowDownNarrowWide);

/** Lucide graphic for sort descending controls. */
export const SortDescendingIcon =
  /* @__PURE__ */ createInteractionIcon(ArrowDownWideNarrow);

/** Lucide graphic for sort manual controls. */
export const SortManualIcon =
  /* @__PURE__ */ createInteractionIcon(GripVertical);

/** Lucide graphic for sparkles controls. */
export const SparklesIcon = /* @__PURE__ */ createInteractionIcon(Sparkles);

/** Lucide graphic for split controls. */
export const SplitIcon = /* @__PURE__ */ createInteractionIcon(Columns2);

/** Lucide graphic for starred controls. */
export const StarredIcon = /* @__PURE__ */ createInteractionIcon(
  Star,
  undefined,
  "currentColor"
);

/** Lucide graphic for strikethrough controls. */
export const StrikethroughIcon =
  /* @__PURE__ */ createInteractionIcon(Strikethrough);

/** Lucide graphic for subscribe controls. */
export const SubscribeIcon = /* @__PURE__ */ createInteractionIcon(Bell);

/** Lucide graphic for sun controls. */
export const SunIcon = /* @__PURE__ */ createInteractionIcon(Sun);

/** Lucide graphic for table columns distribute controls. */
export const TableColumnsDistributeIcon =
  /* @__PURE__ */ createInteractionIcon(Columns3);

/** Lucide graphic for table header column controls. */
export const TableHeaderColumnIcon =
  /* @__PURE__ */ createInteractionIcon(PanelLeft);

/** Lucide graphic for table header row controls. */
export const TableHeaderRowIcon =
  /* @__PURE__ */ createInteractionIcon(PanelTop);

/** Lucide graphic for table controls. */
export const TableIcon = /* @__PURE__ */ createInteractionIcon(Table);

/** Lucide graphic for table merge cells controls. */
export const TableMergeCellsIcon =
  /* @__PURE__ */ createInteractionIcon(TableCellsMerge);

/** Lucide graphic for table of contents controls. */
export const TableOfContentsIcon =
  /* @__PURE__ */ createInteractionIcon(TableOfContents);

/** Lucide graphic for table split cells controls. */
export const TableSplitCellsIcon =
  /* @__PURE__ */ createInteractionIcon(TableCellsSplit);

/** Lucide graphic for team controls. */
export const TeamIcon = /* @__PURE__ */ createInteractionIcon(Building2);

/** Lucide graphic for text wrap controls. */
export const TextWrapIcon = /* @__PURE__ */ createInteractionIcon(WrapText);

/** Lucide graphic for todo list controls. */
export const TodoListIcon = /* @__PURE__ */ createInteractionIcon(ListTodo);

/** Lucide graphic for tools controls. */
export const ToolsIcon = /* @__PURE__ */ createInteractionIcon(Wrench);

/**
 * Renders the trash action with a raised lid while a document is over its target.
 *
 * @param props the SVG attributes and drag-target state.
 * @param ref the reference to the rendered SVG element.
 * @returns the Lucide trash graphic.
 */
export const TrashIcon = forwardRef<SVGSVGElement, InteractionIconProps>(
  function TrashIcon({ open, ...props }, ref) {
    return <TrashGraphic icon={Trash2} $open={open} {...props} ref={ref} />;
  }
);

/** Lucide graphic for unpublish controls. */
export const UnpublishIcon = /* @__PURE__ */ createInteractionIcon(GlobeLock);

/** Lucide graphic for unstarred controls. */
export const UnstarredIcon = /* @__PURE__ */ createInteractionIcon(Star);

/** Lucide graphic for unsubscribe controls. */
export const UnsubscribeIcon = /* @__PURE__ */ createInteractionIcon(BellOff);

/** Lucide graphic for user controls. */
export const UserIcon = /* @__PURE__ */ createInteractionIcon(UserRound);

/** Lucide graphic for user remove controls. */
export const UserRemoveIcon =
  /* @__PURE__ */ createInteractionIcon(UserRoundMinus);

/** Lucide graphic for warning controls. */
export const WarningIcon = /* @__PURE__ */ createInteractionIcon(TriangleAlert);

/** Lucide graphic for zoom in controls. */
export const ZoomInIcon = /* @__PURE__ */ createInteractionIcon(ZoomIn);

/** Lucide graphic for zoom out controls. */
export const ZoomOutIcon = /* @__PURE__ */ createInteractionIcon(ZoomOut);

/**
 * Adapts a Lucide graphic to existing interactive control props and SVG refs.
 *
 * @param Component the graphic for the control.
 * @param ExpandedComponent the optional graphic for expanded or open controls.
 * @param fill the fill used to distinguish selected icons.
 * @returns the compatible interactive icon component.
 */
function createInteractionIcon(
  Component: IconComponent,
  ExpandedComponent?: IconComponent,
  fill = "none"
) {
  const Icon = forwardRef<SVGSVGElement, InteractionIconProps>(
    function InteractionIcon({ expanded, open, ...props }, ref) {
      return (
        <LucideIcon
          icon={
            (expanded || open) && ExpandedComponent
              ? ExpandedComponent
              : Component
          }
          fill={fill === "currentColor" ? (props.color ?? fill) : fill}
          {...props}
          ref={ref}
        />
      );
    }
  );
  Icon.displayName = Component.displayName;
  return Icon;
}

const TrashGraphic = styled(LucideIcon)<{ $open?: boolean }>`
  path:nth-last-child(-n + 2) {
    transform: ${(props) =>
      props.$open ? "translateY(-2px) rotate(-12deg)" : "none"};
    transform-origin: 12px 6px;
    transition: transform 100ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    path {
      transition: none;
    }
  }
`;
