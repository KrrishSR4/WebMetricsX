import { useNavigate } from 'react-router-dom';
import { Landing } from '@/components/landing/Landing';

const Index = () => {
  const navigate = useNavigate();

  return <Landing onLaunch={() => navigate('/monitor')} />;
};

export default Index;
