require 'erb'
require 'fileutils'

# This is a simple class to help return ERB bindings.
# Represents a project
class Project
  attr_accessor :name

  # Creates a new project object
  # @param name [String] the name of the project
  def initialize(name)
    @name = name
  end

  # Returns the ERB bindings for this object
  def get_binding
    binding()
  end
end

# This class is responsible for bootstraping the project.
class Starter
  # Creates a new starter object
  # @param templates [String] the path for the templates folderm, defaults to 'bootstrap/templates'
  # @param project [Project] the project object to bootstrap.
  def initialize(templates = 'bootstrap/templates', project)
    raise ArgumentError, 'templates needs to be a directory' unless Dir.exist? templates
    raise ArgumentError, 'project needs to be a Project class' unless project.is_a? Project

    @templates = templates
    @project = project
  end

  def bootstrap
    copy_static_resources
    unpack_templates
    install
  end

  private

  # Fills in the templates with .erb format.
  # The default location for template files is in the 'templates' directory.
  def unpack_templates
    Dir.new(@templates).each do |template|
      extension = File.extname(template)
      next unless extension == '.erb'

      # Take the template file and fill in the gaps
      filename = File.basename(template, extension)
      contents = File.read(File.join(@templates, template))
      erb = ERB.new(contents)
      output = erb.result(@project.get_binding)
    
      new_filename = filename.gsub('starter', @project.name)
      target = File.join(Dir.pwd, new_filename)
      File.write(target, output)
    end
  end

  # Copy the files and folders found in 'static_resources' to the root folder where
  # the command is ran from.
  def copy_static_resources
    FileUtils.copy_entry('bootstrap/static_resources', Dir.pwd)
  end

  # Runs 'xcodegen' and 'pod install' to finish setting up the project.
  def install
    puts `xcodegen`
    puts `pod install`
  end
end

# Create a new project with the argument coming from the command line
project = Project.new(ARGV[0])
# Bootstrap the project with the given project
Starter.new(project).bootstrap
