// Global type override for react-icons to work with React 19
declare module 'react-icons/*' {
  import { ComponentType, SVGProps } from 'react';
  export const [IconName]: ComponentType<SVGProps<SVGSVGElement> & { size?: string | number; color?: string }>;
}

// More specific declarations
declare module 'react-icons/fa' {
  import { ComponentType } from 'react';
  const Icon: ComponentType<any>;
  export default Icon;
  export const FaHome: ComponentType<any>;
  export const FaUsers: ComponentType<any>;
  export const FaSitemap: ComponentType<any>;
  export const FaImages: ComponentType<any>;
  export const FaPhotoVideo: ComponentType<any>;
  export const FaCalendarAlt: ComponentType<any>;
  export const FaVideo: ComponentType<any>;
  export const FaCog: ComponentType<any>;
  export const FaBars: ComponentType<any>;
  export const FaTimes: ComponentType<any>;
  export const FaPlus: ComponentType<any>;
  export const FaCalendar: ComponentType<any>;
  export const FaHeart: ComponentType<any>;
  export const FaComment: ComponentType<any>;
  export const FaPhone: ComponentType<any>;
  export const FaDesktop: ComponentType<any>;
  export const FaMicrophone: ComponentType<any>;
  export const FaUser: ComponentType<any>;
  export const FaLock: ComponentType<any>;
  export const FaBell: ComponentType<any>;
  export const FaShieldAlt: ComponentType<any>;
  export const FaQuestionCircle: ComponentType<any>;
  export const FaUpload: ComponentType<any>;
  export const FaDownload: ComponentType<any>;
  export const FaTrash: ComponentType<any>;
  export const FaEdit: ComponentType<any>;
  export const FaEye: ComponentType<any>;
  export const FaSearch: ComponentType<any>;
  export const FaFilter: ComponentType<any>;
  export const FaSort: ComponentType<any>;
  export const FaEnvelope: ComponentType<any>;
  export const FaMapMarkerAlt: ComponentType<any>;
  export const FaClock: ComponentType<any>;
  export const FaCheckCircle: ComponentType<any>;
  export const FaTimesCircle: ComponentType<any>;
  export const FaExclamationCircle: ComponentType<any>;
  export const FaInfoCircle: ComponentType<any>;
  export const FaUserShield: ComponentType<any>;
  export const FaEllipsisV: ComponentType<any>;
  export const FaImage: ComponentType<any>;
}

declare module 'react-icons/fi' {
  import { ComponentType } from 'react';
  export const FiCheck: ComponentType<any>;
  export const FiCopy: ComponentType<any>;
  export const FiLogIn: ComponentType<any>;
  export const FiVideoOff: ComponentType<any>;
  export const FiMicOff: ComponentType<any>;
}

declare module 'react-icons/md' {
  import { ComponentType } from 'react';
  export const MdDashboard: ComponentType<any>;
}
