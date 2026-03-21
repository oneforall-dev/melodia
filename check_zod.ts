
import { z } from 'zod';

console.log('Zod imported successfully');
const schema = z.string();
console.log('Schema created:', schema.safeParse('test'));
