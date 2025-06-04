interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageLayout({ children, title, description, actions }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {actions}
            </div>
          )}
        </div>
        
        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}