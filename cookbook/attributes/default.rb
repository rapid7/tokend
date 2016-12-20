
default['tokend']['user'] = 'tokend'
default['tokend']['group'] = 'tokend'

default['tokend']['paths']['directory'] = '/opt/tokend'
default['tokend']['paths']['executable'] = ::File.join(node['tokend']['paths']['directory'], 'bin/server.js')
default['tokend']['paths']['configuration'] = '/etc/tokend/config.json'

default['tokend']['config'] = Mash.new
default['tokend']['version'] = nil
default['tokend']['enable'] = true
