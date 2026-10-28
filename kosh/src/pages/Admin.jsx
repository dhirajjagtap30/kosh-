import { Cards, Head } from "../shared";
import { admin } from "../data";
export default function Admin() {
  return (
    <section className="kw-sec"><div className="kw-wrap">
      <Head n="01 | Admin Panel" title="Create & manage tests smarter" sub="Powerful admin controls for your complete testing workflow." />
      <Cards items={admin} />
    </div></section>
  );
}
