import path from 'path';
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'NotoSans',
  fonts: [
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Regular.ttf'),
      fontWeight: 'normal',
    },
    {
      src: path.join(process.cwd(), 'public', 'fonts', 'NotoSans-Bold.ttf'),
      fontWeight: 'bold',
    },
  ],
});
