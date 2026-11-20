import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SutIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sut/dashboard');
  }, [router]);

  return <div>Redirecting to SUT Login...</div>;
}
