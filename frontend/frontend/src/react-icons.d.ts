declare module 'react-icons/fa' {
  import * as React from 'react';
  
  export interface IconBaseProps extends React.SVGAttributes<SVGElement> {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export type IconType = (props: IconBaseProps) => JSX.Element;
  
  export const FaPlus: IconType;
  export const FaUpload: IconType;
  export const FaEdit: IconType;
  export const FaTrash: IconType;
  export const FaTimes: IconType;
  export const FaBell: IconType;
  export const FaUser: IconType;
  export const FaBars: IconType;
  export const FaEnvelope: IconType;
  export const FaImages: IconType;
  export const FaUsers: IconType;
  export const FaCalendarAlt: IconType;
  export const FaVideo: IconType;
  export const FaCalendar: IconType;
  export const FaMapMarkerAlt: IconType;
  export const FaCheckCircle: IconType;
  export const FaQuestionCircle: IconType;
  export const FaDownload: IconType;
  export const FaGoogleDrive: IconType;
  export const FaHeart: IconType;
  export const FaComment: IconType;
  export const FaMicrophone: IconType;
  export const FaShieldAlt: IconType;
  export const FaLock: IconType;
  export const FaCog: IconType;
  export const FaHome: IconType;
  export const FaSitemap: IconType;
  export const FaPhotoVideo: IconType;
}

declare module 'react-icons/fi' {
  import * as React from 'react';
  
  export interface IconBaseProps extends React.SVGAttributes<SVGElement> {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export type IconType = (props: IconBaseProps) => JSX.Element;
  
  export const FiCheck: IconType;
  export const FiSend: IconType;
  export const FiImage: IconType;
  export const FiCopy: IconType;
  export const FiVideoOff: IconType;
  export const FiMicOff: IconType;
  export const FiFile: IconType;
}

declare module 'react-icons/md' {
  import * as React from 'react';
  
  export interface IconBaseProps extends React.SVGAttributes<SVGElement> {
    children?: React.ReactNode;
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export type IconType = (props: IconBaseProps) => JSX.Element;
  
  export const MdDashboard: IconType;
}
