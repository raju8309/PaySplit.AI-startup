import { Zap } from "lucide-react";

const Footer = () => {
  const columns = [
    {
      title: "Product",
      links: ["How It Works", "AI Features", "Browser Extension", "Pricing", "Security"],
    },
    {
      title: "Company",
      links: ["About", "Blog", "Careers", "Press", "Contact"],
    },
    {
      title: "Resources",
      links: ["Documentation", "API Reference", "Status", "Changelog", "Support"],
    },
    {
      title: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Compliance"],
    },
  ];

  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-6">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">
                PaySplit<span className="text-primary"> AI</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Intelligent payment splitting for the modern shopper.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 PaySplit AI. All rights reserved.</p>
          <p>Built by Anuroop Jajoba</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
