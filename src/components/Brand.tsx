import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ light = false }: { light?: boolean }) {
  return <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="AccessLens home"><span className="brand-mark"><Eye size={23} strokeWidth={2.2} /></span><span>access<span>lens</span></span></Link>;
}
