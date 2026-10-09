# Adds the MondayQuestWidget extension (home widget + Live Activity) to the
# Capacitor Xcode project and wires entitlements. Idempotent.
# Run through scripts/native-setup.sh, which provides the xcodeproj gem.
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT = File.join(ROOT, 'ios/App/App.xcodeproj')
APP_ID = 'ee.forgr.mondayquest'
WIDGET = 'MondayQuestWidget'
DEPLOYMENT = '17.0'

project = Xcodeproj::Project.open(PROJECT)
app = project.targets.find { |t| t.name == 'App' }

# Capacitor derives the SPM platform from the first deployment target it finds.
project.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT }

# App entitlements (HealthKit + App Group shared with the widget)
unless project.main_group['App'].files.any? { |f| f.path == 'App.entitlements' }
  project.main_group['App'].new_file('App.entitlements')
end
app.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
  c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT
end

if project.targets.none? { |t| t.name == WIDGET }
  ext = project.new_target(:app_extension, WIDGET, :ios, DEPLOYMENT)
  group = project.main_group.new_group(WIDGET, WIDGET)
  swift = group.new_file('MondayQuestWidget.swift')
  group.new_file('Info.plist')
  group.new_file('MondayQuestWidget.entitlements')
  ext.add_file_references([swift])

  marketing = app.build_configurations.first.build_settings['MARKETING_VERSION'] || '1.0'
  build = app.build_configurations.first.build_settings['CURRENT_PROJECT_VERSION'] || '1'
  ext.build_configurations.each do |c|
    s = c.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{APP_ID}.widget"
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['INFOPLIST_FILE'] = "#{WIDGET}/Info.plist"
    s['CODE_SIGN_ENTITLEMENTS'] = "#{WIDGET}/#{WIDGET}.entitlements"
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1,2'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT
    s['MARKETING_VERSION'] = marketing
    s['CURRENT_PROJECT_VERSION'] = build
    s['SKIP_INSTALL'] = 'YES'
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME'] = ''
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  end

  # Shared widget-kit Swift code (CapgoWidgetKitShared) straight from node_modules
  pkg = project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
  pkg.relative_path = '../../node_modules/@capgo/capacitor-widget-kit'
  project.root_object.package_references << pkg
  dep = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  dep.package = pkg
  dep.product_name = 'CapgoWidgetKitShared'
  ext.package_product_dependencies << dep
  bf = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  bf.product_ref = dep
  ext.frameworks_build_phase.files << bf

  # Embed the extension in the app
  app.add_dependency(ext)
  embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' } ||
          app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
  embed_file = embed.add_file_reference(ext.product_reference, true)
  embed_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts "✓ added #{WIDGET} target"
else
  puts "• #{WIDGET} target already present"
end

project.save
