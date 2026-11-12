import sys, glob, importlib.util, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import write
from looks import apply
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../dist/stories')
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), 's_*.py'))):
    spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    apply(m.ST); write(m.ST, OUT)
