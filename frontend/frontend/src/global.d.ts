/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// Override react-icons types for React 19 compatibility
declare module 'react-icons/fa' {
  import { FC, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export const FaPlus: FC<IconBaseProps>;
  export const FaUpload: FC<IconBaseProps>;
  export const FaEdit: FC<IconBaseProps>;
  export const FaTrash: FC<IconBaseProps>;
  export const FaTimes: FC<IconBaseProps>;
  export const FaBell: FC<IconBaseProps>;
  export const FaUser: FC<IconBaseProps>;
  export const FaBars: FC<IconBaseProps>;
  export const FaEnvelope: FC<IconBaseProps>;
  export const FaImages: FC<IconBaseProps>;
  export const FaUsers: FC<IconBaseProps>;
  export const FaCalendarAlt: FC<IconBaseProps>;
  export const FaVideo: FC<IconBaseProps>;
  export const FaCalendar: FC<IconBaseProps>;
  export const FaMapMarkerAlt: FC<IconBaseProps>;
  export const FaCheckCircle: FC<IconBaseProps>;
  export const FaQuestionCircle: FC<IconBaseProps>;
  export const FaDownload: FC<IconBaseProps>;
  export const FaGoogleDrive: FC<IconBaseProps>;
  export const FaHeart: FC<IconBaseProps>;
  export const FaComment: FC<IconBaseProps>;
  export const FaMicrophone: FC<IconBaseProps>;
  export const FaShieldAlt: FC<IconBaseProps>;
  export const FaLock: FC<IconBaseProps>;
  export const FaCog: FC<IconBaseProps>;
  export const FaHome: FC<IconBaseProps>;
  export const FaSitemap: FC<IconBaseProps>;
  export const FaPhotoVideo: FC<IconBaseProps>;
  export const FaTree: FC<IconBaseProps>;
}

declare module 'react-icons/fi' {
  import { FC, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export const FiCheck: FC<IconBaseProps>;
  export const FiSend: FC<IconBaseProps>;
  export const FiImage: FC<IconBaseProps>;
  export const FiCopy: FC<IconBaseProps>;
  export const FiVideoOff: FC<IconBaseProps>;
  export const FiMicOff: FC<IconBaseProps>;
  export const FiFile: FC<IconBaseProps>;
}

declare module 'react-icons/md' {
  import { FC, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export const MdDashboard: FC<IconBaseProps>;
}
