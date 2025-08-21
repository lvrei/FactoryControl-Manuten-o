import { useNavigate } from 'react-router-dom';

export function useBackToOperator() {
  const navigate = useNavigate();

  const goBackToOperator = () => {
    navigate('/operator');
  };

  return { goBackToOperator };
}
